'use strict';

const fs = require('fs');
const fsp = fs.promises;

const Canvas = require('canvas');
const Image = Canvas.Image;
const { wrapColorData, wrapWaypointData } = require('tibia-minimap-png');

const handleParallel = require('./handle-parallel.js');

const arrayToMinimapMarkerBuffer = require('./array-to-minimap-marker.js');
const colors = require('./colors.js');
const idToXyz = require('./id-to-xyz.js');
const pixelDataToMapBuffer = require('./pixel-data-to-map.js');
const pixelDataToPathBuffer = require('./pixel-data-to-path.js');

const EMPTY_MAP_BUFFER = Buffer.alloc(0x10000, colors.unexploredMapByte);
const EMPTY_PATH_BUFFER = Buffer.alloc(0x10000, colors.unexploredPathByte);

const GLOBALS = {};

const RESULTS = new Map();
const addResult = (id, type, result) => {
	if (!RESULTS.has(id)) {
		RESULTS.set(id, {});
	}
	const reference = RESULTS.get(id);
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
	//console.log(`${fileName} created successfully.`);
};

const forEachTile = (context, map, callback, name, floorID) => {
	const isGroundFloor = floorID == '07';
	const bounds = GLOBALS.bounds;
	const image = new Image();
	image.src = map;
	context.drawImage(image, 0, 0, bounds.width, bounds.height);
	// Extract each 256×256px tile.
	let yOffset = 0;
	while (yOffset < bounds.height) {
		const y = bounds.yMin + (yOffset / 256);
		const yID = String(y).padStart(3, '0');
		let xOffset = 0;
		while (xOffset < bounds.width) {
			const x = bounds.xMin + (xOffset / 256);
			const xID = String(x).padStart(3, '0');
			const pixels = context.getImageData(xOffset, yOffset, 256, 256);
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
		for (const [id, data] of RESULTS) {
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
