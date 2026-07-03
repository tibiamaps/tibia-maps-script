import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import fs from 'node:fs';
const fsp = fs.promises;
import path from 'node:path';

const Canvas = require('canvas');
const Image = Canvas.Image;
const utf8 = require('utf8');

const GLOBALS = {};
const BATCH_SIZE = 50;
const resetContext = (context, fillStyle) => {
	context.fillStyle = fillStyle;
	context.fillRect(0, 0, GLOBALS.bounds.width, GLOBALS.bounds.height);
};

import { unexploredMap, unexploredPath } from './colors.mjs';
import { glob } from './glob-promise.mjs';
import { handleParallel } from './handle-parallel.mjs';
import { iconsById } from './icons.mjs';
import { minimapIdToAbsoluteXyz } from './minimap-id-to-absolute-xyz.mjs';
import { saveCanvasToPng } from './save-canvas-to-png.mjs';
import { sortMarkers } from './sort-markers.mjs';
import { writeJson } from './write-json.mjs';

const minimapBytesToCoordinate = (x1, x2, x3) => {
	// https://tibiamaps.io/guides/minimap-file-format#coordinates
	return x1 + 0x80 * x2 + 0x4000 * x3 - 0x4080;
};

const assertByte = (actual, expected, description) => {
	// Throw a descriptive error if the actual byte does not match the expected value.
	if (actual !== expected) {
		const actualHex = actual === undefined ? 'undefined' : `0x${actual.toString(16).padStart(2, '0')}`;
		throw new Error(`Unexpected ${description}: expected 0x${expected.toString(16).padStart(2, '0')}, got ${actualHex}.`);
	}
};

const parseMarkerData = (buffer) => {
	// https://tibiamaps.io/guides/minimap-file-format#map-marker-data
	const markers = [];
	let index = 0;
	const length = buffer.length;

	// If there are no markers, our work is done here.
	if (length == 0) {
		return markers;
	}

	// For each marker…
	while (index < length) {
		const marker = {};

		// The first byte is 0x0A.
		assertByte(buffer[index++], 0x0A, 'marker start delimiter');
		// The second byte indicates the size of this marker’s data block (i.e. all
		// the following bytes).
		const markerSize = buffer.readUInt8(index++, 1);
		// The following byte is another 0x0A separator, indicating the start of the
		// coordinate data block.
		assertByte(buffer[index++], 0x0A, 'coordinate block separator');
		// The next byte indicates the size of this marker’s coordinate data block.
		const coordinateSize = buffer.readUInt8(index++, 1);
		// For simplicity, we only support the coordinate sizes used on the official
		// servers. For those, `coordinateSize` is always 0x0A.
		assertByte(coordinateSize, 0x0A, 'coordinate block size');
		// The 0x08 byte marks the start of the `x` coordinate data.
		assertByte(buffer[index++], 0x08, 'x coordinate start byte');
		// The next 1, 2, or 3 bytes represent the `x` coordinate.
		const x1 = buffer.readUInt8(index++, 1);
		const x2 = buffer.readUInt8(index++, 1);
		const x3 = buffer.readUInt8(index++, 1);
		marker.x = minimapBytesToCoordinate(x1, x2, x3);
		// The 0x10 byte marks the end of the `x` coordinate data.
		assertByte(buffer[index++], 0x10, 'x coordinate end byte');
		// The next 1, 2, or 3 bytes represent the `y` coordinate.
		const y1 = buffer.readUInt8(index++, 1);
		const y2 = buffer.readUInt8(index++, 1);
		const y3 = buffer.readUInt8(index++, 1);
		marker.y = minimapBytesToCoordinate(y1, y2, y3);
		// The 0x18 byte marks the end of the `x` coordinate data.
		assertByte(buffer[index++], 0x18, 'y coordinate end byte');
		// The next byte is the floor ID.
		marker.z = buffer.readUInt8(index++, 1);
		// The following byte is 0x10.
		assertByte(buffer[index++], 0x10, 'icon start byte');
		// The next byte represents the image ID of the marker icon.
		const imageID = buffer.readUInt8(index++, 1);
		marker.icon = iconsById.get(imageID);
		// The next byte is 0x1A.
		assertByte(buffer[index++], 0x1A, 'description start byte');
		// The next byte indicates the size of the string that follows.
		const descriptionLength = buffer.readUInt8(index++, 1);
		// The following bytes represent the marker description as a UTF-8–encoded
		// string.
		const descriptionBuffer = buffer.slice(index, index + descriptionLength);
		index += descriptionLength;
		marker.description = utf8.decode(
			descriptionBuffer.toString('binary')
		);
		// The next few bytes are usually 0x20 0x00, marking the end of the marker.
		// However, there are cases where the client produces a different format
		// for reasons unknown.
		// https://github.com/tibiamaps/tibia-maps-script/issues/21
		while (index < length && buffer[index] !== 0x0A) index++;

		// Create a sorted-by-key version of the marker object.
		const sorted = {
			description: marker.description,
			icon: marker.icon,
			x: marker.x,
			y: marker.y,
			z: marker.z,
		};
		markers.push(sorted);
	}

	sortMarkers(markers);

	// Remove duplicate markers.
	const set = new Set();
	const uniqueMarkers = markers.filter((marker) => {
		const key = `${marker.x}_${marker.y}_${marker.z}_${marker.icon}_${marker.description.toLowerCase()}`;
		const isDuplicate = set.has(key);
		set.add(key);
		return !isDuplicate;
	});
	return uniqueMarkers;
};

const drawTileSection = async (context, fileName, prefix, bounds = GLOBALS.bounds) => {
	// Draw a 256x256 map or path section onto the canvas context.
	const id = path.basename(fileName, '.png').replace(prefix, '');
	const coordinates = minimapIdToAbsoluteXyz(id);
	const xOffset = coordinates.x - bounds.xMin;
	const yOffset = coordinates.y - bounds.yMin;
	const image = await Canvas.loadImage(fileName);
	context.drawImage(image, xOffset, yOffset, 256, 256);
};

const renderFloorLayer = async ({ floorID, floorNumber, mapDirectory, dataDirectory, filePattern, prefix, fillStyle, outputName, bounds = GLOBALS.bounds }) => {
	// Create a canvas for the specified floor layer and render all matching tiles.
	const canvas = Canvas.createCanvas(bounds.width, bounds.height);
	const context = canvas.getContext('2d');
	resetContext(context, fillStyle);
	const files = await glob(`${mapDirectory}/${filePattern}_*_${floorNumber}.png`);
	// Process tiles in batches to limit concurrent image loading and file reads.
	for (let i = 0; i < files.length; i += BATCH_SIZE) {
		const chunk = files.slice(i, i + BATCH_SIZE);
		await handleParallel(chunk, (fileName) => {
			return drawTileSection(context, fileName, prefix, bounds);
		});
	}
	await saveCanvasToPng(
		`${dataDirectory}/${outputName}`,
		canvas
	);
};

const renderFloor = async (floorID, mapDirectory, dataDirectory) => {
	console.log(`Rendering floor ${floorID}…`);
	const floorNumber = Number(floorID);
	// Render floor map and path layers sequentially to minimize peak memory usage.
	await renderFloorLayer({
		floorID,
		floorNumber,
		mapDirectory,
		dataDirectory,
		filePattern: 'Minimap_Color',
		prefix: /^Minimap_Color_/,
		fillStyle: `rgb(${unexploredMap.r}, ${unexploredMap.g}, ${unexploredMap.b}`,
		outputName: `floor-${floorID}-map.png`,
	});
	await renderFloorLayer({
		floorID,
		floorNumber,
		mapDirectory,
		dataDirectory,
		filePattern: 'Minimap_WaypointCost',
		prefix: /^Minimap_WaypointCost_/,
		fillStyle: `rgb(${unexploredPath.r}, ${unexploredPath.g}, ${unexploredPath.b}`,
		outputName: `floor-${floorID}-path.png`,
	});
};

const mergeMarkers = (...markerGroups) => {
	const markerMap = new Map();

	for (const markerGroup of markerGroups) {
		for (const marker of markerGroup) {
			const key = `${marker.x}.${marker.y}.${marker.z}`;
			markerMap.set(key, marker);
		}
	}

	return sortMarkers([...markerMap.values()]);
};

export const convertFromMinimap = async (bounds, mapDirectory, dataDirectory, includeMarkers, markersOnly, unionMode = false) => {
	GLOBALS.bounds = bounds;
	if (!mapDirectory) {
		mapDirectory = 'minimap';
	}
	if (!dataDirectory) {
		dataDirectory = 'data';
	}
	if (!markersOnly) {
		// Process each floor sequentially so garbage collection can reclaim canvas allocations.
		for (const floorID of bounds.floorIDs) {
			await renderFloor(floorID, mapDirectory, dataDirectory);
		}
	}
	const fileName = `${mapDirectory}/minimapmarkers.bin`;
	if (!fs.existsSync(fileName)) {
		return;
	}
	const buffer = await fsp.readFile(fileName);
	let allMarkers = parseMarkerData(buffer);
	if (unionMode) {
		const baseFileName = `${dataDirectory}/markers.json`;
		if (fs.existsSync(baseFileName)) {
			const baseJson = await fsp.readFile(baseFileName, 'utf8');
			const baseMarkers = JSON.parse(baseJson);

			allMarkers = mergeMarkers(baseMarkers, allMarkers);
		}
	}
	writeJson(
		`${dataDirectory}/markers.json`,
		includeMarkers && allMarkers ? allMarkers : []
	);
};
