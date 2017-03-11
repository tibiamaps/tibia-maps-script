'use strict';

const utf8 = require('utf8');

const icons = require('./icons.js');

const convertCoordinate = (x) => {
	// https://tibiamaps.io/guides/minimap-file-format#coordinates
	const x3 = x >> 14;
	const x1 = 0x80 + x % 0x80;
	const x2 = (x - 0x4000 * x3 - x1 + 0x4080) >> 7;
	return [ x1, x2, x3 ];
};

const arrayToMinimapMarkerBuffer = (array) => {
	// https://tibiamaps.io/guides/minimap-file-format#map-marker-data
	let result = new Buffer(0);
	for (const marker of array) {
		const encodedDescription = utf8.encode(marker.description);
		const encodedDescriptionLength = encodedDescription.length;
		const markerSize = 19 + encodedDescriptionLength;
		// Assume x1, x2, x3 and y1, y2, y3 are all needed.
		const coordinateSize = 10;
		const markerBuffer = new Buffer(markerSize);
		markerBuffer.writeUInt8(0x0A, 0);
		markerBuffer.writeUInt8(markerSize, 1);
		markerBuffer.writeUInt8(0x0A, 2);
		markerBuffer.writeUInt8(coordinateSize, 3);
		const [ x1, x2, x3 ] = convertCoordinate(marker.x);
		markerBuffer.writeUInt8(x1, 4);
		markerBuffer.writeUInt8(x2, 5);
		markerBuffer.writeUInt8(x3, 6);
		markerBuffer.writeUInt8(0x10, 7);
		const [ y1, y2, y3 ] = convertCoordinate(marker.y);
		markerBuffer.writeUInt8(y1, 8);
		markerBuffer.writeUInt8(y2, 9);
		markerBuffer.writeUInt8(y3, 10);
		markerBuffer.writeUInt8(0x18, 11);
		markerBuffer.writeUInt8(marker.z, 12);
		markerBuffer.writeUInt8(0x10, 13);
		const iconByte = icons.byName[marker.icon];
		console.assert(iconByte != null);
		markerBuffer.writeUInt8(iconByte, 14);
		markerBuffer.writeUInt8(0x1A, 15);
		markerBuffer.writeUInt8(encodedDescriptionLength, 16);
		console.assert(
			marker.description.length <= 100,
			'Marker description should be 100 symbols or fewer for the minimap format'
		);
		markerBuffer.write(
			encodedDescription,
			17,
			encodedDescriptionLength,
			'binary'
		);
		markerBuffer.writeUInt8(0x20, 17 + encodedDescriptionLength);
		markerBuffer.writeUInt8(0x00, 18 + encodedDescriptionLength);
		result = Buffer.concat([result, markerBuffer]);
	}
	return result;
};

module.exports = arrayToMinimapMarkerBuffer;
