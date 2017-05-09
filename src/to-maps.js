'use strict';

const fs = require('fs');

const Canvas = require('canvas');
const Image = Canvas.Image;
const padStart = require('lodash.padstart');
const { wrapColorData, wrapWaypointData } = require('tibia-minimap-png');

const handleSequence = require('./handle-sequence.js');
const writeJSON = require('./write-json.js');

const arrayToFlashMarkerBuffer = require('./array-to-flash-marker.js');
const arrayToMarkerBuffer = require('./array-to-marker.js');
const arrayToMinimapMarkerBuffer = require('./array-to-minimap-marker.js');
const colors = require('./colors.js');
const idToXyz = require('./id-to-xyz.js');
const pixelDataToMapBuffer = require('./pixel-data-to-map.js');
const pixelDataToPathBuffer = require('./pixel-data-to-path.js');
const transposeBuffer = require('./transpose-buffer.js');

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

let MINIMAP_MARKERS = new Buffer(0);
const createBinaryMarkers = (floorID) => {
	return new Promise((resolve, reject) => {
		const data = require(`${GLOBALS.dataDirectory}/floor-${floorID}-markers.json`);
		Object.keys(data).forEach((id) => {
			const markers = data[id];
			const markerBuffer = arrayToMarkerBuffer(markers);
			addResult(id, 'markerBuffer', markerBuffer);
			const flashMarkers = arrayToFlashMarkerBuffer(markers);
			addResult(id, 'flashMarkers', flashMarkers);
			const minimapMarkers = arrayToMinimapMarkerBuffer(markers);
			// TODO: To match the Tibia installer’s import functionality, the markers
			// are supposed to be ordered by their `x` coordinate value, then by
			// their `y` coordinate value, in ascending order.
			MINIMAP_MARKERS = Buffer.concat([
				MINIMAP_MARKERS,
				minimapMarkers
			]);
		});
		resolve();
	});
};

const convertToMaps = (dataDirectory, outputPath, includeMarkers, isFlash) => {
	if (!dataDirectory) {
		dataDirectory = 'data';
	}
	if (!isFlash && !outputPath) {
		outputPath = 'Automap-new';
	}
	GLOBALS.dataDirectory = dataDirectory;
	const bounds = JSON.parse(fs.readFileSync(`${dataDirectory}/bounds.json`));
	GLOBALS.bounds = bounds;
	GLOBALS.canvas = new Canvas(bounds.width, bounds.height);
	GLOBALS.context = GLOBALS.canvas.getContext('2d');
	const floorIDs = bounds.floorIDs;
	handleSequence(floorIDs, createBinaryMap).then(() => {
		return handleSequence(floorIDs, createBinaryPath);
	}).then(() => {
		if (includeMarkers) {
			return handleSequence(floorIDs, createBinaryMarkers);
		}
	}).then(() => {
		const noMarkersBuffer = new Buffer([0x00, 0x00, 0x00, 0x00]);
		if (isFlash) {
			// https://tibiamaps.io/guides/exp-file-format
			const lines = Object.keys(RESULTS).map((id) => {
				const coordinates = idToXyz(id);
				const data = RESULTS[id];
				const entry = {
					'colordata': (data.mapBuffer ? transposeBuffer(data.mapBuffer) : EMPTY_MAP_BUFFER).toString('base64'),
					'mapmarkers': data.flashMarkers || [],
					'waypoints': (data.pathBuffer ? transposeBuffer(data.pathBuffer) : EMPTY_PATH_BUFFER).toString('base64'),
					'x': coordinates.x * 256,
					'y': coordinates.y * 256,
					'z': coordinates.z
				};
				return JSON.stringify(entry);
			});
			const contents = lines.join('\r\n') + '\r\n';
			fs.writeFileSync(outputPath, contents, 'binary');
			console.log(`${outputPath} created successfully.`);
			return;
		}
		Object.keys(RESULTS).forEach((id) => {
			const data = RESULTS[id];
			if (!data.mapBuffer) {
				data.mapBuffer = EMPTY_MAP_BUFFER;
			}
			if (!data.pathBuffer) {
				data.pathBuffer = EMPTY_PATH_BUFFER;
			}
			// Generate the Tibia 10-compatible `*.map` files.
			const buffer = Buffer.concat([
				data.mapBuffer,
				data.pathBuffer,
				includeMarkers ? data.markerBuffer || noMarkersBuffer : noMarkersBuffer
			]);
			writeBuffer(`${outputPath}/${id}.map`, buffer);
			// Generate the Tibia 11-compatible minimap PNGs.
			const coords = idToXyz(id);
			const minimapId = `${ coords.x * 256 }_${ coords.y * 256 }_${ coords.z }`;
			writeBuffer(
				`minimap/Minimap_Color_${minimapId}.png`,
				wrapColorData(data.mapBuffer)
			);
			writeBuffer(
				`minimap/Minimap_WaypointCost_${minimapId}.png`,
				wrapWaypointData(data.pathBuffer)
			);
		});
		if (includeMarkers && MINIMAP_MARKERS.length) {
			// The Tibia 11 installer doesn’t create the file if no markers are set.
			writeBuffer(`minimap/minimapmarkers.bin`, MINIMAP_MARKERS);
		}
	}).catch((exception) => {
		console.error(exception.stack);
		reject(exception);
	});
};

module.exports = convertToMaps;
