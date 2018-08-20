'use strict';

const fs = require('fs');
const glob = require('glob');
const path = require('path');

const padStart = require('lodash.padstart');
const Canvas = require('canvas');
const Image = Canvas.Image;
const range = require('lodash.range');
const sortObject = require('sort-object');
const utf8 = require('utf8');

const GLOBALS = {};
const resetContext = (context, fillStyle) => {
	context.fillStyle = fillStyle;
	context.fillRect(0, 0, GLOBALS.bounds.width, GLOBALS.bounds.height);
};

const icons = require('./icons.js');
const colors = require('./colors.js');
const writeJSON = require('./write-json.js');
const saveCanvasToPNG = require('./save-canvas-to-png.js');
const handleSequence = require('./handle-sequence.js');
const minimapIdToAbsoluteXyz = require('./minimap-id-to-absolute-xyz.js');

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
		marker.icon = icons.byID[imageID];
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
		// The byte sequence 0x20 0x00 marks the end of the marker.
		console.assert(buffer[index++] === 0x20);
		console.assert(buffer[index++] === 0x00);

		const sorted = sortObject(marker);
		markers.push(sorted);
	}

	// Sort markers so they start in the top left, then go from top to bottom.
	// Example:
	//     · 2 · 4 · · ·
	//     1 · 3 · · · 7
	//     · · · 5 · 6 ·
	markers.sort((a, b) => {
		return (a.x * 100000 + a.y) - (b.x * 100000 + b.y);
	});

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

const drawMapSection = (fileName, includeMarkers) => {
	return new Promise((resolve, reject) => {
		const id = path.basename(fileName, '.png').replace(/^Minimap_Color_/, '');
		const coordinates = minimapIdToAbsoluteXyz(id);
		const xOffset = coordinates.x - GLOBALS.bounds.xMin * 256;
		const yOffset = coordinates.y - GLOBALS.bounds.yMin * 256;
		fs.readFile(fileName, (error, buffer) => {
			if (error) {
				reject(error);
			}
			const image = new Image();
			image.src = buffer;
			GLOBALS.mapContext.drawImage(image, xOffset, yOffset, 256, 256);
			resolve();
		});
	});
};

const drawPathSection = (fileName, includeMarkers) => {
	return new Promise((resolve, reject) => {
		const id = path.basename(fileName, '.png').replace(/^Minimap_WaypointCost_/, '');
		const coordinates = minimapIdToAbsoluteXyz(id);
		const xOffset = coordinates.x - GLOBALS.bounds.xMin * 256;
		const yOffset = coordinates.y - GLOBALS.bounds.yMin * 256;
		fs.readFile(fileName, (error, buffer) => {
			if (error) {
				reject(error);
			}
			const image = new Image();
			image.src = buffer;
			GLOBALS.pathContext.drawImage(image, xOffset, yOffset, 256, 256);
			resolve();
		});
	});
};

const renderFloor = (floorID, mapDirectory, dataDirectory, includeMarkers) => {
	console.log(`Rendering floor ${floorID}…`);
	const unexploredMap = colors.unexploredMap;
	resetContext(
		GLOBALS.mapContext,
		`rgb(${unexploredMap.r}, ${unexploredMap.g}, ${unexploredMap.b}`
	);
	const unexploredPath = colors.unexploredPath;
	resetContext(
		GLOBALS.pathContext,
		`rgb(${unexploredPath.r}, ${unexploredPath.g}, ${unexploredPath.b}`
	);
	const floorNumber = Number(floorID);
	const pMap = new Promise((resolve, reject) => {
		glob(`${mapDirectory}/Minimap_Color_*_${floorNumber}.png`, async (error, files) => {
			// Handle all map files for this floor sequentially.
			try {
				await handleSequence(files, (fileName) => {
					return drawMapSection(fileName, includeMarkers);
				});
				await saveCanvasToPNG(
					`${dataDirectory}/floor-${floorID}-map.png`,
					GLOBALS.mapCanvas
				);
				resolve();
			} catch (exception) {
				console.error(exception.stack);
				reject(exception);
			}
		});
	});

	const pPath = new Promise((resolve, reject) => {
		glob(`${mapDirectory}/Minimap_WaypointCost_*_${floorNumber}.png`, async (error, files) => {
			// Handle all path files for this floor sequentially.
			try {
				await handleSequence(files, (fileName) => {
					return drawPathSection(fileName, includeMarkers);
				});
				await saveCanvasToPNG(
					`${dataDirectory}/floor-${floorID}-path.png`,
					GLOBALS.pathCanvas
				);
				resolve();
			} catch (exception) {
				console.error(exception.stack);
				reject(exception);
			}
		});
	});

	return new Promise(async (resolve, reject) => {
		try {
			await pMap;
			await pPath;
			resolve();
		} catch (exception) {
			reject();
		}
	});
};

const convertFromMaps = async (bounds, mapDirectory, dataDirectory, includeMarkers) => {
	GLOBALS.bounds = bounds;
	GLOBALS.mapCanvas = new Canvas(bounds.width, bounds.height);
	GLOBALS.mapContext = GLOBALS.mapCanvas.getContext('2d');
	GLOBALS.pathCanvas = new Canvas(bounds.width, bounds.height);
	GLOBALS.pathContext = GLOBALS.pathCanvas.getContext('2d');
	if (!mapDirectory) {
		mapDirectory = 'minimap';
	}
	if (!dataDirectory) {
		dataDirectory = 'data';
	}
	await handleSequence(bounds.floorIDs, (floorID) => {
		return renderFloor(floorID, mapDirectory, dataDirectory, includeMarkers);
	});
	const fileName = `${mapDirectory}/minimapmarkers.bin`;
	if (!fs.existsSync(fileName)) {
		return;
	}
	fs.readFile(fileName, (error, buffer) => {
		if (error) {
			throw new Error(error);
		}
		const allMarkers = parseMarkerData(buffer);
		const markersByFloor = new Map();
		for (const marker of allMarkers) {
			const floorID = padStart(marker.z, 2, '0');
			if (markersByFloor.has(floorID)) {
				markersByFloor.get(floorID).push(marker);
			} else {
				markersByFloor.set(floorID, [marker]);
			}
		}
		for (const floorID of bounds.floorIDs) {
			const markers = markersByFloor.get(floorID);
			writeJSON(
				`${dataDirectory}/floor-${floorID}-markers.json`,
				includeMarkers && markers ? markers : []
			);
		}
	});
};

module.exports = convertFromMaps;
