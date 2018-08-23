'use strict';

const fs = require('fs');

const Canvas = require('canvas');
const Image = Canvas.Image;
const padStart = require('lodash.padstart');
const { wrapColorData, wrapWaypointData } = require('tibia-minimap-png');

const handleSequence = require('./handle-sequence.js');
const writeJSON = require('./write-json.js');

const arrayToMinimapMarkerBuffer = require('./array-to-minimap-marker.js');
const colors = require('./colors.js');
const idToXyz = require('./id-to-xyz.js');
const pixelDataToMapBuffer = require('./pixel-data-to-map.js');
const pixelDataToPathBuffer = require('./pixel-data-to-path.js');

const EMPTY_MAP_BUFFER = Buffer.alloc(0x10000, colors.unexploredMapByte);
const EMPTY_PATH_BUFFER = Buffer.alloc(0x10000, colors.unexploredPathByte);

const GLOBALS = {};

const RESULTS = {};
const addResult = (id, type, result) => {
	if (!RESULTS[id]) {
		RESULTS[id] = {};
	}
	const reference = RESULTS[id];
	reference[type] = result;
};

const writeBuffer = (fileName, buffer) => {
	if (buffer == null) {
		console.log('Undefined buffer; skipping creating `' + fileName + '`');
		return;
	}
	const writeStream = fs.createWriteStream(fileName);
	writeStream.write(buffer);
	writeStream.end();
	console.log(`${fileName} created successfully.`);
};

const forEachTile = (map, callback, name, floorID) => {
	const isGroundFloor = floorID == '07';
	const bounds = GLOBALS.bounds;
	const image = new Image();
	image.src = map;
	GLOBALS.context.drawImage(image, 0, 0, bounds.width, bounds.height);
	// Extract each 256×256px tile.
	let yOffset = 0;
	while (yOffset < bounds.height) {
		const y = bounds.yMin + (yOffset / 256);
		const yID = padStart(y, 3, '0');
		let xOffset = 0;
		while (xOffset < bounds.width) {
			const x = bounds.xMin + (xOffset / 256);
			const xID = padStart(x, 3, '0');
			const pixels = GLOBALS.context.getImageData(xOffset, yOffset, 256, 256);
			const buffer = callback(pixels, isGroundFloor);
			const id = `${xID}${yID}${floorID}`;
			if (buffer) {
				addResult(id, name, buffer);
			}
			xOffset += 256;
		}
		yOffset += 256;
	}
};

const createBinaryMap = (floorID) => {
	return new Promise((resolve, reject) => {
		fs.readFile(`${GLOBALS.dataDirectory}/floor-${floorID}-map.png`, (error, map) => {
			if (error) {
				throw new Error(error);
			}
			forEachTile(map, pixelDataToMapBuffer, 'mapBuffer', floorID);
			resolve();
		});
	});
};

const createBinaryPath = (floorID) => {
	return new Promise((resolve, reject) => {
		fs.readFile(`${GLOBALS.dataDirectory}/floor-${floorID}-path.png`, (error, map) => {
			if (error) {
				throw new Error(error);
			}
			forEachTile(map, pixelDataToPathBuffer, 'pathBuffer', floorID);
			resolve();
		});
	});
};

let MINIMAP_MARKERS = Buffer.alloc(0);
const createBinaryMarkers = (floorID) => {
	return new Promise((resolve, reject) => {
		const markers = require(`${GLOBALS.dataDirectory}/floor-${floorID}-markers.json`);
		const minimapMarkers = arrayToMinimapMarkerBuffer(markers);
		// TODO: To match the Tibia installer’s import functionality, the markers
		// are supposed to be ordered by their `x` coordinate value, then by
		// their `y` coordinate value, in ascending order.
		MINIMAP_MARKERS = Buffer.concat([
			MINIMAP_MARKERS,
			minimapMarkers
		]);
		resolve();
	});
};

const convertToMinimap = async (dataDirectory, outputPath, includeMarkers, overlayGrid) => {
	if (!dataDirectory) {
		dataDirectory = 'data';
	}
	if (!outputPath) {
		outputPath = 'minimap-new';
	}
	GLOBALS.dataDirectory = dataDirectory;
	const bounds = JSON.parse(fs.readFileSync(`${dataDirectory}/bounds.json`));
	GLOBALS.bounds = bounds;
	GLOBALS.canvas = new Canvas(bounds.width, bounds.height);
	GLOBALS.context = GLOBALS.canvas.getContext('2d');
	const floorIDs = bounds.floorIDs;
	try {
		await handleSequence(floorIDs, createBinaryMap);
		await handleSequence(floorIDs, createBinaryPath);
		if (includeMarkers) {
			await handleSequence(floorIDs, createBinaryMarkers);
		}
		for (const id of Object.keys(RESULTS)) {
			const data = RESULTS[id];
			if (!data.mapBuffer) {
				data.mapBuffer = EMPTY_MAP_BUFFER;
			}
			if (!data.pathBuffer) {
				data.pathBuffer = EMPTY_PATH_BUFFER;
			}
			// Generate the Tibia 11-compatible minimap PNGs.
			const coords = idToXyz(id);
			const minimapId = `${ coords.x * 256 }_${ coords.y * 256 }_${ coords.z }`;
			writeBuffer(
				`${outputPath}/Minimap_Color_${minimapId}.png`,
				wrapColorData(data.mapBuffer, { overlayGrid })
			);
			writeBuffer(
				`${outputPath}/Minimap_WaypointCost_${minimapId}.png`,
				wrapWaypointData(data.pathBuffer)
			);
		}
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
