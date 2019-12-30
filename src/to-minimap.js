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

const EMPTY_MAP_BUFFER = Buffer.alloc(0x10000, colors.unexploredMapByte);
const EMPTY_PATH_BUFFER = Buffer.alloc(0x10000, colors.unexploredPathByte);

const GLOBALS = {};

const writeBuffer = (fileName, buffer) => {
	if (buffer == null) {
		console.log('Undefined buffer; skipping creating `' + fileName + '`');
		return;
	}
	const writeStream = fs.createWriteStream(fileName);
	writeStream.write(buffer);
	writeStream.end();
	//console.log(`${fileName} created successfully.`);
};

const forEachTile = (context, map, callback, name, floorID) => {
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
			const buffer = callback(pixels, isGroundFloor);
			const id = `${x}_${y}_${z}`;
			if (buffer) {
				if (name === 'mapBuffer') {
					writeBuffer(
						`${GLOBALS.outputPath}/Minimap_Color_${id}.png`,
						wrapColorData(buffer, { overlayGrid: GLOBALS.overlayGrid })
					);
				} else if (name === 'pathBuffer') {
					writeBuffer(
						`${GLOBALS.outputPath}/Minimap_WaypointCost_${id}.png`,
						wrapWaypointData(buffer)
					);
				}
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
	forEachTile(context, map, pixelDataToMapBuffer, 'mapBuffer', floorID);
};

const createBinaryPath = async (floorID) => {
	const bounds = GLOBALS.bounds;
	const canvas = Canvas.createCanvas(bounds.width, bounds.height);
	const context = canvas.getContext('2d');
	const map = await fsp.readFile(`${GLOBALS.dataDirectory}/floor-${floorID}-path.png`);
	forEachTile(context, map, pixelDataToPathBuffer, 'pathBuffer', floorID);
};

let MINIMAP_MARKERS = Buffer.alloc(0);
const createBinaryMarkers = async (floorID) => {
	const json = await fsp.readFile(`${GLOBALS.dataDirectory}/floor-${floorID}-markers.json`, 'utf8');
	const markers = JSON.parse(json);
	const minimapMarkers = arrayToMinimapMarkerBuffer(markers);
	// TODO: To match the Tibia installer’s import functionality, the markers
	// are supposed to be ordered by their `x` coordinate value, then by
	// their `y` coordinate value, in ascending order.
	MINIMAP_MARKERS = Buffer.concat([
		MINIMAP_MARKERS,
		minimapMarkers
	]);
};

const convertToMinimap = async (dataDirectory, outputPath, includeMarkers, overlayGrid) => {
	if (!dataDirectory) {
		dataDirectory = 'data';
	}
	if (!outputPath) {
		outputPath = 'minimap-new';
	}
	GLOBALS.dataDirectory = dataDirectory;
	GLOBALS.outputPath = outputPath;
	GLOBALS.overlayGrid = overlayGrid;
	const bounds = JSON.parse(fs.readFileSync(`${dataDirectory}/bounds.json`));
	GLOBALS.bounds = bounds;
	GLOBALS.canvas = Canvas.createCanvas(bounds.width, bounds.height);
	GLOBALS.context = GLOBALS.canvas.getContext('2d');
	const floorIDs = bounds.floorIDs;
	try {
		const promises = [
			handleParallel(floorIDs, createBinaryMap),
			handleParallel(floorIDs, createBinaryPath),
		];
		if (includeMarkers) {
			promises.push(handleParallel(floorIDs, createBinaryMarkers));
		}
		await Promise.all(promises);
		// TODO: We *could* keep track of all the files that have been written, and
		// if any `Color` files don’t have a corresponding `WaypointCost` file or
		// vice versa, we could then create it using `EMPTY_PATH_BUFFER` or
		// `EMPTY_MAP_BUFFER`. Not sure if this is worth the hassle, though.
		if (includeMarkers && MINIMAP_MARKERS.length) {
			// The Tibia 11 installer doesn’t create the file if no markers are set.
			writeBuffer(`${outputPath}/minimapmarkers.bin`, MINIMAP_MARKERS);
		}
	} catch (exception) {
		console.error(exception.stack);
		reject(exception);
	}
};

module.exports = convertToMinimap;
