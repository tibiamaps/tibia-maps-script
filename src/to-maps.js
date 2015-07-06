'use strict';

const fs = require('fs');

const Canvas = require('canvas');
const Image = Canvas.Image;
const padLeft = require('lodash.padleft');

const handleSequence = require('./handle-sequence.js');
const writeJSON = require('./write-json.js');

const pixelDataToMapBuffer = require('./pixel-data-to-map.js');
const pixelDataToPathBuffer = require('./pixel-data-to-path.js');
const arrayToMarkerBuffer = require('./array-to-marker.js');

const globals = {};

const RESULTS = {};
const addResult = function(id, type, result) {
	if (!RESULTS[id]) {
		RESULTS[id] = {};
	}
	const reference = RESULTS[id];
	reference[type] = result;
};

const forEachTile = function(map, callback, name, floorID) {
	const bounds = globals.bounds;
	const image = new Image();
	image.src = map;
	globals.context.drawImage(image, 0, 0, bounds.width, bounds.height);
	// Extract each 256×256px tile.
	let yOffset = 0;
	while (yOffset < bounds.height) {
		const y = bounds.yMin + (yOffset / 256);
		const yID = padLeft(y, 3, '0');
		let xOffset = 0;
		while (xOffset < bounds.width) {
			const x = bounds.xMin + (xOffset / 256);
			const xID = padLeft(x, 3, '0');
			const pixels = globals.context.getImageData(xOffset, yOffset, 256, 256);
			const buffer = callback(pixels.data);
			const id = `${xID}${yID}${floorID}`;
			addResult(id, name, buffer);
			xOffset += 256;
		}
		yOffset += 256;
	}
};

const createBinaryMap = function(floorID) {
	return new Promise(function(resolve, reject) {
		fs.readFile(`${globals.dataDirectory}/floor-${floorID}-map.png`, function(error, map) {
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
		fs.readFile(`${globals.dataDirectory}/floor-${floorID}-path.png`, function(error, map) {
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
		const data = require(`${globals.dataDirectory}/floor-${floorID}-markers.json`);
		Object.keys(data).forEach(function(id) {
			const markers = data[id];
			const markerBuffer = arrayToMarkerBuffer(markers);
			addResult(id, 'markerBuffer', markerBuffer);
		});
		resolve();
	});
};

const convertToMaps = function(dataDirectory, mapsDirectory) {
	if (!dataDirectory) {
		dataDirectory = 'data';
	}
	if (!mapsDirectory) {
		mapsDirectory = 'Automap-new';
	}
	globals.dataDirectory = dataDirectory;
	globals.mapsDirectory = mapsDirectory;
	const bounds = JSON.parse(fs.readFileSync(`${dataDirectory}/bounds.json`));
	globals.bounds = bounds;
	globals.canvas = new Canvas(bounds.width, bounds.height);
	globals.context = globals.canvas.getContext('2d');
	const floorIDs = bounds.floorIDs;
	handleSequence(floorIDs, createBinaryMap).then(function() {
		return handleSequence(floorIDs, createBinaryPath);
	}).then(function() {
		return handleSequence(floorIDs, createBinaryMarkers);
	}).then(function() {
		Object.keys(RESULTS).forEach(function(id) {
			const data = RESULTS[id];
			const noMarkersBuffer = new Buffer([0x0, 0x0, 0x0, 0x0]);
			const buffer = Buffer.concat([
				data.mapBuffer,
				data.pathBuffer,
				data.markerBuffer || noMarkersBuffer
			]);
			const fileName = `${mapsDirectory}/${id}.map`;
			const writeStream = fs.createWriteStream(fileName);
			writeStream.write(buffer);
			writeStream.end();
			console.log(`${fileName} created successfully.`);
		});
	}).catch(function(error) {
		console.error(error.stack);
		reject(error);
	});
};

module.exports = convertToMaps;
