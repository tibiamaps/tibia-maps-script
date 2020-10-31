import { wrapColorData, wrapWaypointData } from 'tibia-minimap-png';

import { handleParallel } from './handle-parallel.mjs';

import { arrayToMinimapMarkerBuffer } from './array-to-minimap-marker.mjs';
import { unexploredMapByte, unexploredPathByte } from './colors.mjs';
import { pixelDataToMapBuffer } from './pixel-data-to-map.mjs';
import { pixelDataToPathBuffer } from './pixel-data-to-path.mjs';
import { pngToBuffer } from './png-to-buffer.mjs';
import { sortMarkers } from './sort-markers.mjs';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import fs from 'node:fs';
const fsp = fs.promises;

import path from 'node:path';

const Canvas = require('canvas');
const Image = Canvas.Image;

const EMPTY_MAP_BUFFER = Buffer.alloc(0x10000, unexploredMapByte);
const EMPTY_PATH_BUFFER = Buffer.alloc(0x10000, unexploredPathByte);

const GLOBALS = {};

const writeBuffer = (fileName, buffer) => {
	if (buffer == null) {
		console.log('Undefined buffer; skipping creating `' + fileName + '`');
		return;
	}
	return fsp.writeFile(fileName, buffer);
};

const forEachTile = (context, map, createBufferCallback, writeBufferCallback, floorID) => {
	const isGroundFloor = floorID == '07';
	const z = Number(floorID);
	const bounds = GLOBALS.bounds;
	const image = new Image();
	image.src = map;
	context.drawImage(image, 0, 0, bounds.width, bounds.height);
	// Extract each 256×256px tile.
	let yOffset = 0;
	while (yOffset < bounds.height) {
		const y = bounds.yMin + yOffset;
		let xOffset = 0;
		while (xOffset < bounds.width) {
			const x = bounds.xMin + xOffset;
			const pixels = context.getImageData(xOffset, yOffset, 256, 256);
			const buffer = createBufferCallback(pixels, isGroundFloor);
			const id = `${x}_${y}_${z}`;
			if (buffer) {
				writeBufferCallback(buffer, id);
			}
			xOffset += 256;
		}
		yOffset += 256;
	}
};

const createBinaryMap = async (floorID) => {
	const bounds = GLOBALS.bounds;
	const canvas = Canvas.createCanvas(bounds.width, bounds.height);
	const context = canvas.getContext('2d');
	const map = await fsp.readFile(`${GLOBALS.dataDirectory}/floor-${floorID}-map.png`);
	forEachTile(context, map, pixelDataToMapBuffer, writeBinaryMapBuffer, floorID);
};

GLOBALS.mapIds = new Set();
const writeBinaryMapBuffer = (buffer, id) => {
	GLOBALS.mapIds.add(id);
	const fileName = `Minimap_Color_${id}.png`;
	const dest = `${GLOBALS.outputPath}/${fileName}`;
	if (GLOBALS.extraMap.has(fileName)) {
		const source = GLOBALS.extraMap.get(fileName);
		buffer = pngToBuffer(source);
	}
	GLOBALS.ioPromises.push(writeBuffer(
		dest,
		wrapColorData(buffer, { overlayGrid: GLOBALS.overlayGrid })
	));
};

const createBinaryPath = async (floorID) => {
	const bounds = GLOBALS.bounds;
	const canvas = Canvas.createCanvas(bounds.width, bounds.height);
	const context = canvas.getContext('2d');
	const map = await fsp.readFile(`${GLOBALS.dataDirectory}/floor-${floorID}-path.png`);
	forEachTile(context, map, pixelDataToPathBuffer, writeBinaryPathBuffer, floorID);
};

GLOBALS.pathIds = new Set();
const writeBinaryPathBuffer = (buffer, id) => {
	GLOBALS.pathIds.add(id);
	const fileName = `Minimap_WaypointCost_${id}.png`;
	const dest = `${GLOBALS.outputPath}/${fileName}`;
	if (GLOBALS.extraMap.has(fileName)) {
		const source = GLOBALS.extraMap.get(fileName);
		buffer = pngToBuffer(source);
	}
	GLOBALS.ioPromises.push(writeBuffer(
		dest,
		wrapWaypointData(buffer)
	));
};

let MINIMAP_MARKERS = Buffer.alloc(0);
const createBinaryMarkers = async (extra) => {
	const getMarkers = async (dir) => {
		const json = await fsp.readFile(`${dir}/markers.json`, 'utf8');
		const markers = JSON.parse(json);
		return markers;
	};
	const dirs = [
		GLOBALS.dataDirectory,
	];
	if (extra) {
		dirs.push(...extra);
	}
	const parts = await Promise.all(dirs.map(getMarkers));
	const markers = sortMarkers(parts.flat());
	const minimapMarkers = arrayToMinimapMarkerBuffer(markers);
	// TODO: To match the Tibia installer’s import functionality, the markers
	// are supposed to be ordered by their `x` coordinate value, then by
	// their `y` coordinate value, in ascending order.
	MINIMAP_MARKERS = minimapMarkers;
	return minimapMarkers;
};

export const convertToMinimap = async (dataDirectory, outputPath, extra, includeMarkers, overlayGrid) => {
	if (!dataDirectory) {
		dataDirectory = 'data';
	}
	if (!outputPath) {
		outputPath = 'minimap-new';
	}
	GLOBALS.dataDirectory = dataDirectory;
	GLOBALS.extra = extra;
	GLOBALS.extraMap = (() => {
		const map = new Map();
		if (!extra) return map;
		for (const dir of extra) {
			const images = fs.readdirSync(dir).filter(file => file.endsWith('.png'));
			for (const image of images) {
				map.set(image, path.resolve(dir, image));
			}
		}
		return map;
	})();
	GLOBALS.outputPath = outputPath;
	GLOBALS.overlayGrid = overlayGrid;
	GLOBALS.ioPromises = [];
	const bounds = JSON.parse(fs.readFileSync(`${dataDirectory}/bounds.json`));
	GLOBALS.bounds = bounds;
	GLOBALS.canvas = Canvas.createCanvas(bounds.width, bounds.height);
	GLOBALS.context = GLOBALS.canvas.getContext('2d');
	const floorIDs = bounds.floorIDs;
	try {
		const bufferPromises = [
			handleParallel(floorIDs, createBinaryMap),
			handleParallel(floorIDs, createBinaryPath),
		];
		if (includeMarkers) {
			bufferPromises.push(createBinaryMarkers(extra));
		}
		await Promise.all(bufferPromises);
		// Check for `Color` files lacking a corresponding `WaypointCost`
		// file, and force their creation.
		// https://github.com/tibiamaps/tibia-map-data/issues/105#issuecomment-714613895
		const missingWaypointIds = [...GLOBALS.mapIds]
			.filter(fileName => !GLOBALS.pathIds.has(fileName));
		for (const id of missingWaypointIds) {
			console.log('Creating missing `WaypointCost` file:', id);
			writeBinaryPathBuffer(EMPTY_PATH_BUFFER, id);
		}
		if (includeMarkers && MINIMAP_MARKERS.length) {
			// The Tibia 11 installer doesn’t create the file if no markers are set.
			GLOBALS.ioPromises.push(writeBuffer(`${outputPath}/minimapmarkers.bin`, MINIMAP_MARKERS));
		}
		// Wait for all file operations to complete.
		await Promise.all(GLOBALS.ioPromises);
	} catch (exception) {
		console.error(exception.stack);
		reject(exception);
	}
};
