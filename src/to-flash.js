'use strict';

const fs = require('fs');

const Canvas = require('canvas');
const Image = Canvas.Image;
const padLeft = require('lodash.padleft');

const handleSequence = require('./handle-sequence.js');
const writeJSON = require('./write-json.js');

const arrayToFlashMarkers = require('./array-to-flash-markers.js');
const idToXyz = require('./id-to-xyz.js');
const pixelDataToMapBuffer = require('./pixel-data-to-map.js');
const pixelDataToPathBuffer = require('./pixel-data-to-path.js');
const transposeBuffer = require('./transpose-buffer.js');

const GLOBALS = {};

const RESULTS = {};
const addResult = function(id, type, result) {
	if (!RESULTS[id]) {
		RESULTS[id] = {};
	}
	const reference = RESULTS[id];
	reference[type] = result;
};

const forEachTile = function(map, callback, name, floorID) {
	const isGroundFloor = floorID == '07';
	const bounds = GLOBALS.bounds;
	const image = new Image();
	image.src = map;
	GLOBALS.context.drawImage(image, 0, 0, bounds.width, bounds.height);
	// Extract each 256×256px tile.
	let yOffset = 0;
	while (yOffset < bounds.height) {
		const y = bounds.yMin + (yOffset / 256);
		const yID = padLeft(y, 3, '0');
		let xOffset = 0;
		while (xOffset < bounds.width) {
			const x = bounds.xMin + (xOffset / 256);
			const xID = padLeft(x, 3, '0');
			const pixels = GLOBALS.context.getImageData(xOffset, yOffset, 256, 256);
			const buffer = callback(pixels.data, isGroundFloor);
			const id = `${xID}${yID}${floorID}`;
			if (buffer) {
				addResult(id, name, buffer);
			}
			xOffset += 256;
		}
		yOffset += 256;
	}
};

const createBinaryMap = function(floorID) {
	return new Promise(function(resolve, reject) {
		fs.readFile(`${GLOBALS.dataDirectory}/floor-${floorID}-map.png`, function(error, map) {
			if (error) {
				throw new Error(error);
			}
			forEachTile(map, pixelDataToMapBuffer, 'mapBuffer', floorID);
			resolve();
		});
	});
};

const createBinaryPath = function(floorID) {
	return new Promise(function(resolve, reject) {
		fs.readFile(`${GLOBALS.dataDirectory}/floor-${floorID}-path.png`, function(error, map) {
			if (error) {
				throw new Error(error);
			}
			forEachTile(map, pixelDataToPathBuffer, 'pathBuffer', floorID);
			resolve();
		});
	});
};

const createBinaryMarkers = function(floorID) {
	return new Promise(function(resolve, reject) {
		const data = require(`${GLOBALS.dataDirectory}/floor-${floorID}-markers.json`);
		Object.keys(data).forEach(function(id) {
			const markers = data[id];
			const flashMarkers = arrayToFlashMarkers(markers, floorID);
			addResult(id, 'flashMarkers', flashMarkers);
		});
		resolve();
	});
};

const convertToFlash = function(dataDirectory, outputFile, includeMarkers) {
	if (!dataDirectory) {
		dataDirectory = 'data';
	}
	GLOBALS.dataDirectory = dataDirectory;
	const bounds = JSON.parse(fs.readFileSync(`${dataDirectory}/bounds.json`));
	GLOBALS.bounds = bounds;
	GLOBALS.canvas = new Canvas(bounds.width, bounds.height);
	GLOBALS.context = GLOBALS.canvas.getContext('2d');
	const floorIDs = bounds.floorIDs;
	handleSequence(floorIDs, createBinaryMap).then(function() {
		return handleSequence(floorIDs, createBinaryPath);
	}).then(function() {
		if (includeMarkers) {
			return handleSequence(floorIDs, createBinaryMarkers);
		}
	}).then(function() {
		const lines = Object.keys(RESULTS).map(function(id) {
			const coordinates = idToXyz(id);
			const data = RESULTS[id];
			const entry = {
				'colordata': transposeBuffer(data.mapBuffer).toString('base64'),
				'mapmarkers': data.flashMarkers || [],
				'waypoints': transposeBuffer(data.pathBuffer).toString('base64'),
				'x': coordinates.x * 256,
				'y': coordinates.y * 256,
				'z': coordinates.z
			};
			return JSON.stringify(entry);
		});
		const contents = lines.join('\r\n') + '\r\n';
		fs.writeFileSync(outputFile, contents);
		console.log(`${outputFile} created successfully.`);
	}).catch(function(exception) {
		console.error(exception.stack);
		reject(exception);
	});
};

module.exports = convertToFlash;
