'use strict';

const fs = require('fs');
const glob = require('glob');
const path = require('path');

const Canvas = require('canvas');
const Image = Canvas.Image;
const range = require('lodash.range');
const sortObject = require('sort-object');

const GLOBALS = {};
const resetContext = function(context, fillStyle) {
	context.fillStyle = fillStyle;
	context.fillRect(0, 0, GLOBALS.bounds.width, GLOBALS.bounds.height);
};

const icons = require('./icons.js');
const colors = require('./colors.js');
const writeJSON = require('./write-json.js');
const saveCanvasToPNG = require('./save-canvas-to-png.js');
const handleSequence = require('./handle-sequence.js');

const mapPixelPalette = {};
const pixelCanvas = new Canvas(1, 1);
const pixelContext = pixelCanvas.getContext('2d');
Object.keys(colors.byByte).forEach(function(pixelByte) {
	const color = colors.byByte[pixelByte];
	const imageData = pixelContext.createImageData(1, 1);
	const data = imageData.data;
	data[0] = color.r;
	data[1] = color.g;
	data[2] = color.b;
	data[3] = 0xFF;
	mapPixelPalette[pixelByte] = imageData;
});

const pathPixelPalette = {};
for (const pixelByte of range(0, 255 + 1)) {
	const component = 0xFF - pixelByte;
	const imageData = pixelContext.createImageData(1, 1);
	const data = imageData.data;
	data[0] = component;
	data[1] = component;
	data[2] = component;
	data[3] = 0xFF;
	pathPixelPalette[pixelByte] = imageData;
}

let markers = {};
const resetMarkers = function() {
	markers = {};
};

const parseMapData = function(buffer, xOffset, yOffset) {
	// TODO: instead of passing in xOffset/yOffset and using them in here,
	// this function should just render a 256×256px image as ImageData and return
	// it. Then the outer function can position it.
	// Note: the map data first contains the 256 pixels in the first column, then
	// the 256 pixels in the second column, etc. I.e. the pixels go from top to
	// bottom, rather than from left to right.
	let xIndex = -1;
	let bufferIndex = -1;
	while (++xIndex < 256) {
		let yIndex = -1;
		while (++yIndex < 256) {
			const pixelByte = buffer[++bufferIndex];
			GLOBALS.mapContext.putImageData(
				mapPixelPalette[pixelByte],
				xOffset + xIndex,
				yOffset + yIndex
			);
		}
	}
};

const parsePathData = function(buffer, xOffset, yOffset) {
	// TODO: instead of passing in xOffset/yOffset and using them in here,
	// this function should just render a 256×256px image as ImageData and return
	// it (or even return an image buffer). Then the outer function can position
	// it.
	let xIndex = -1;
	let bufferIndex = -1;
	while (++xIndex < 256) {
		let yIndex = -1;
		while (++yIndex < 256) {
			const pixelByte = buffer[++bufferIndex];
			GLOBALS.pathContext.putImageData(
				pathPixelPalette[pixelByte],
				xOffset + xIndex,
				yOffset + yIndex
			);
		}
	}
};

const parseMarkerData = function(buffer) {
	const markers = [];
	let index = 0;
	// The first 4 bytes indicate the number of markers on the map.
	const markerCount = buffer.readUIntLE(index, 4);
	index += 4;
	// If there are no markers, our work is done here.
	if (markerCount == 0) {
		return markers;
	}

	// For each marker…
	while (markers.length < markerCount) {
		const marker = {};
		// The first byte is the `x` position.
		marker.xPosition = buffer.readUInt8(index++, 1);
		// The second byte is the map tile it is in on the `x` axis.
		marker.xTile = buffer.readUInt8(index++, 1);
		// The next two bytes are blank.
		console.assert(index++, 0x0);
		console.assert(index++, 0x0);

		// The next byte is the `y` position.
		marker.yPosition = buffer.readUInt8(index++, 1);
		// The next byte is the map tile it is in on the `y` axis.
		marker.yTile = buffer.readUInt8(index++, 1);
		// The next two bytes are blank.
		console.assert(index++, 0x0);
		console.assert(index++, 0x0);

		// The next 4 bytes are the image ID of the marker icon.
		const id = buffer.readUIntLE(index, 4);
		index += 4;
		marker.icon = icons.byID[id];

		// The next 2 bytes indicate the size of the string that follows.
		const descriptionLength = buffer.readUIntLE(index, 2);
		index += 2;

		// Read the string, i.e. the marker’s description. Note: adding an in-game
		// marker with “Iñtërnâtiônàlizætiøn☃💩” as its description results in
		// “Iñtërnâtiônàlizætiøn☃???”, i.e. astral Unicode symbols don’t seem to be
		// supported.
		const descriptionBuffer = buffer.slice(index, index + descriptionLength);
		index += descriptionLength;
		marker.description = descriptionBuffer.toString('binary');

		const sorted = sortObject(marker);
		markers.push(sorted);
	}
	return markers;
};

const drawMapSection = function(fileName) {
	return new Promise(function(resolve, reject) {

		const id = path.basename(fileName, '.map');
		if (id == '13112807') {
			// `13112807.map` is the hacked map TibiaMaps.org file containing
			// impossible color values that break the script because it intentionally
			// doesn’t support non-standard color values.
			// https://i.imgur.com/GPBwhL7.png
			resolve();
			return;
		}
		const x = Number(id.slice(0, 3));
		const xOffset = (x - GLOBALS.bounds.xMin) * 256;
		const y = Number(id.slice(3, 6));
		const yOffset = (y - GLOBALS.bounds.yMin) * 256;
		const z = Number(id.slice(6, 8));

		fs.readFile(fileName, function(error, buffer) {

			if (error) {
				reject(error);
			}

			// The first 0x10000 (256×256) bytes of the map file form the graphical
			// portion of the map. Each byte represents a single visible map pixel.
			const mapData = buffer.slice(0, 0x10000);
			parseMapData(mapData, xOffset, yOffset); // changes global state

			// The next 0x10000 bytes form the map that is used for pathfinding. Each
			// of these 256×256 bytes represents the walking speed on a specific tile.
			// 0 = unexplored/unknown
			// 1–254: the lower the value, the higher your movement speed on that tile
			// 255 = non-walkable
			const pathData = buffer.slice(0x10000, 0x20000);
			parsePathData(pathData, xOffset, yOffset); // changes global state

			// The remaining bytes are map marker data.
			const markerData = buffer.slice(0x20000);
			if (!markerData.length) {
				// In the TibiaMaps.org package, `12712113.map` lacks the 4 null bytes
				// at the end to indicate it has no markers.
				console.warn(`File with invalid marker data: ${fileName}. Fix:`);
				console.log(`printf '\\0\\0\\0\\0' >> ${fileName}`);
			}

			const results = parseMarkerData(markerData);
			if (results.length) {
				markers[id] = results;
			}
			resolve();

		});

	});
};

const renderFloor = function(floorID, mapDirectory, dataDirectory) {
	console.log(`Rendering floor ${floorID}…`);
	return new Promise(function(resolve, reject) {
		const unexplored = colors.byByte['0'];
		resetContext(
			GLOBALS.mapContext,
			`rgb(${unexplored.r}, ${unexplored.g}, ${unexplored.b}`
		);
		resetContext(GLOBALS.pathContext, '#000');
		resetMarkers();
		glob(`${mapDirectory}/*${floorID}.map`, function(error, files) {
			// Handle all map files for this floor sequentially.
			handleSequence(files, drawMapSection).then(function() {
				return saveCanvasToPNG(
					`${dataDirectory}/floor-${floorID}-map.png`,
					GLOBALS.mapCanvas
				);
			}).then(function() {
				return saveCanvasToPNG(
					`${dataDirectory}/floor-${floorID}-path.png`,
					GLOBALS.pathCanvas
				);
			}).then(function() {
				return writeJSON(
					`${dataDirectory}/floor-${floorID}-markers.json`,
					markers
				);
			}).then(function() {
				resolve();
			}).catch(function(error) {
				console.error(error.stack);
				reject(error);
			});
		});
	});
};

const convertFromMaps = function(bounds, mapDirectory, dataDirectory) {
	GLOBALS.bounds = bounds;
	GLOBALS.mapCanvas = new Canvas(bounds.width, bounds.height);
	GLOBALS.mapContext = GLOBALS.mapCanvas.getContext('2d');
	GLOBALS.pathCanvas = new Canvas(bounds.width, bounds.height);
	GLOBALS.pathContext = GLOBALS.pathCanvas.getContext('2d');
	if (!mapDirectory) {
		mapDirectory = 'Automap';
	}
	if (!dataDirectory) {
		dataDirectory = 'data';
	}
	handleSequence(bounds.floorIDs, function(floorID) {
		return renderFloor(floorID, mapDirectory, dataDirectory);
	});
};

module.exports = convertFromMaps;
