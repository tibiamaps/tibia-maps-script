'use strict';

const fs = require('fs');
const fsp = fs.promises;

const Canvas = require('canvas');
const Image = Canvas.Image;
const { wrapColorData, wrapWaypointData } = require('tibia-minimap-png');

const handleParallel = require('./handle-parallel.js');

const arrayToMinimapMarkerBuffer = require('./array-to-minimap-marker.js');
const colors = require('./colors.js');
const pixelDataToMapBuffer = require('./pixel-data-to-map.js');
const pixelDataToPathBuffer = require('./pixel-data-to-path.js');
const sortMarkers = require('./sort-markers.js');

const EMPTY_MAP_BUFFER = Buffer.alloc(0x10000, colors.unexploredMapByte);
const EMPTY_PATH_BUFFER = Buffer.alloc(0x10000, colors.unexploredPathByte);

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

const writeBinaryMapBuffer = (buffer, id) => {
	GLOBALS.ioPromises.push(writeBuffer(
		`${GLOBALS.outputPath}/Minimap_Color_${id}.png`,
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

const writeBinaryPathBuffer = (buffer, id) => {
	GLOBALS.ioPromises.push(writeBuffer(
		`${GLOBALS.outputPath}/Minimap_WaypointCost_${id}.png`,
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

const convertToMinimap = async (dataDirectory, outputPath, extra, includeMarkers, overlayGrid) => {
	if (!dataDirectory) {
		dataDirectory = 'data';
	}
	if (!outputPath) {
		outputPath = 'minimap-new';
	}
	GLOBALS.dataDirectory = dataDirectory;
	GLOBALS.extra = extra;
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
		// TODO: We *could* keep track of all the files that have been written, and
		// if any `Color` files don’t have a corresponding `WaypointCost` file or
		// vice versa, we could then create it using `EMPTY_PATH_BUFFER` or
		// `EMPTY_MAP_BUFFER`. Not sure if this is worth the hassle, though.
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

module.exports = convertToMinimap;
