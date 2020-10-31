import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import fs from 'node:fs';
const fsp = fs.promises;
import path from 'node:path';

const Canvas = require('canvas');
const Image = Canvas.Image;
const utf8 = require('utf8');

const GLOBALS = {};
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
		console.assert(buffer[index++] === 0x0A);
		// The second byte indicates the size of this marker’s data block (i.e. all
		// the following bytes).
		const markerSize = buffer.readUInt8(index++, 1);
		// The following byte is another 0x0A separator, indicating the start of the
		// coordinate data block.
		console.assert(buffer[index++] === 0x0A);
		// The next byte indicates the size of this marker’s coordinate data block.
		const coordinateSize = buffer.readUInt8(index++, 1);
		// For simplicity, we only support the coordinate sizes used on the official
		// servers. For those, `coordinateSize` is always 0x0A.
		console.assert(coordinateSize === 0x0A);
		// The 0x08 byte marks the start of the `x` coordinate data.
		console.assert(buffer[index++] === 0x08);
		// The next 1, 2, or 3 bytes represent the `x` coordinate.
		const x1 = buffer.readUInt8(index++, 1);
		const x2 = buffer.readUInt8(index++, 1);
		const x3 = buffer.readUInt8(index++, 1);
		marker.x = minimapBytesToCoordinate(x1, x2, x3);
		// The 0x10 byte marks the end of the `x` coordinate data.
		console.assert(buffer[index++] === 0x10);
		// The next 1, 2, or 3 bytes represent the `y` coordinate.
		const y1 = buffer.readUInt8(index++, 1);
		const y2 = buffer.readUInt8(index++, 1);
		const y3 = buffer.readUInt8(index++, 1);
		marker.y = minimapBytesToCoordinate(y1, y2, y3);
		// The 0x18 byte marks the end of the `x` coordinate data.
		console.assert(buffer[index++] === 0x18);
		// The next byte is the floor ID.
		marker.z = buffer.readUInt8(index++, 1);
		// The following byte is 0x10.
		console.assert(buffer[index++] === 0x10);
		// The next byte represents the image ID of the marker icon.
		const imageID = buffer.readUInt8(index++, 1);
		marker.icon = iconsById.get(imageID);
		// The next byte is 0x1A.
		console.assert(buffer[index++] === 0x1A);
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
		while (buffer[index] !== undefined && buffer[index] !== 0x0A) index++;

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
		const serialized = JSON.stringify(marker).toLowerCase();
		const isDuplicate = set.has(serialized);
		set.add(serialized);
		return !isDuplicate;
	});
	return uniqueMarkers;
};

const drawMapSection = async (mapContext, fileName) => {
	const id = path.basename(fileName, '.png').replace(/^Minimap_Color_/, '');
	const coordinates = minimapIdToAbsoluteXyz(id);
	const xOffset = coordinates.x - GLOBALS.bounds.xMin;
	const yOffset = coordinates.y - GLOBALS.bounds.yMin;
	const buffer = await fsp.readFile(fileName);
	const image = new Image();
	image.src = buffer;
	mapContext.drawImage(image, xOffset, yOffset, 256, 256);
};

const drawPathSection = async (pathContext, fileName) => {
	const id = path.basename(fileName, '.png').replace(/^Minimap_WaypointCost_/, '');
	const coordinates = minimapIdToAbsoluteXyz(id);
	const xOffset = coordinates.x - GLOBALS.bounds.xMin;
	const yOffset = coordinates.y - GLOBALS.bounds.yMin;
	const buffer = await fsp.readFile(fileName);
	const image = new Image();
	image.src = buffer;
	pathContext.drawImage(image, xOffset, yOffset, 256, 256);
};

const renderFloorMap = async (floorID, floorNumber, mapDirectory, dataDirectory) => {
	const bounds = GLOBALS.bounds;
	const mapCanvas = Canvas.createCanvas(bounds.width, bounds.height);
	const mapContext = mapCanvas.getContext('2d');
	resetContext(
		mapContext,
		`rgb(${unexploredMap.r}, ${unexploredMap.g}, ${unexploredMap.b}`
	);
	// Handle all map files for this floor.
	const files = await glob(`${mapDirectory}/Minimap_Color_*_${floorNumber}.png`);
	await handleParallel(files, (fileName) => {
		return drawMapSection(mapContext, fileName);
	});
	await saveCanvasToPng(
		`${dataDirectory}/floor-${floorID}-map.png`,
		mapCanvas
	);
};

const renderFloorPath = async (floorID, floorNumber, mapDirectory, dataDirectory) => {
	const bounds = GLOBALS.bounds;
	const pathCanvas = Canvas.createCanvas(bounds.width, bounds.height);
	const pathContext = pathCanvas.getContext('2d');
	resetContext(
		pathContext,
		`rgb(${unexploredPath.r}, ${unexploredPath.g}, ${unexploredPath.b}`
	);
	// Handle all path files for this floor.
	const files = await glob(`${mapDirectory}/Minimap_WaypointCost_*_${floorNumber}.png`);
	await handleParallel(files, (fileName) => {
		return drawPathSection(pathContext, fileName);
	});
	await saveCanvasToPng(
		`${dataDirectory}/floor-${floorID}-path.png`,
		pathCanvas
	);
};

const renderFloor = (floorID, mapDirectory, dataDirectory) => {
	console.log(`Rendering floor ${floorID}…`);
	const floorNumber = Number(floorID);
	return Promise.all([
		renderFloorMap(floorID, floorNumber, mapDirectory, dataDirectory),
		renderFloorPath(floorID, floorNumber, mapDirectory, dataDirectory),
	]);
};

export const convertFromMinimap = async (bounds, mapDirectory, dataDirectory, includeMarkers, markersOnly) => {
	GLOBALS.bounds = bounds;
	if (!mapDirectory) {
		mapDirectory = 'minimap';
	}
	if (!dataDirectory) {
		dataDirectory = 'data';
	}
	if (!markersOnly) {
		await handleParallel(bounds.floorIDs, (floorID) => {
			return renderFloor(floorID, mapDirectory, dataDirectory);
		});
	}
	const fileName = `${mapDirectory}/minimapmarkers.bin`;
	if (!fs.existsSync(fileName)) {
		return;
	}
	const buffer = await fsp.readFile(fileName);
	const allMarkers = parseMarkerData(buffer);
	writeJson(
		`${dataDirectory}/markers.json`,
		includeMarkers && allMarkers ? allMarkers : []
	);
};
