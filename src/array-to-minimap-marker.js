'use strict';

const utf8 = require('utf8');

const icons = require('./icons.js');

const coordinateToMinimapBytes = (x) => {
	// https://tibiamaps.io/guides/minimap-file-format#coordinates
	const x3 = x >> 14;
	const x1 = 0x80 + x % 0x80;
	const x2 = (x - 0x4000 * x3 - x1 + 0x4080) >> 7;
	return [ x1, x2, x3 ];
};

const arrayToMinimapMarkerBuffer = (array) => {
	if (!array.sort) { array = []; }
	// Sort markers by their `x`, then `y`, then `z`.
	const sorted = array.sort((a, b) => {
		return (
			(a.x * 10000000 + a.y * 100 + a.z) -
			(b.x * 10000000 + b.y * 100 + b.z)
		);
	});
	// https://tibiamaps.io/guides/minimap-file-format#map-marker-data
	let result = Buffer.alloc(0);
	for (const marker of sorted) {
		const encodedDescription = utf8.encode(marker.description);
		const encodedDescriptionLength = encodedDescription.length;
		const markerSize = 20 + encodedDescriptionLength;
		// Assume x1, x2, x3 and y1, y2, y3 are all needed.
		const coordinateSize = 10;
		const markerBuffer = Buffer.alloc(markerSize);
		markerBuffer.writeUInt8(0x0A, 0);
		markerBuffer.writeUInt8(markerSize - 2, 1);
		markerBuffer.writeUInt8(0x0A, 2);
		markerBuffer.writeUInt8(coordinateSize, 3);
		markerBuffer.writeUInt8(0x08, 4);
		const [ x1, x2, x3 ] = coordinateToMinimapBytes(marker.x);
		markerBuffer.writeUInt8(x1, 5);
		markerBuffer.writeUInt8(x2, 6);
		markerBuffer.writeUInt8(x3, 7);
		markerBuffer.writeUInt8(0x10, 8);
		const [ y1, y2, y3 ] = coordinateToMinimapBytes(marker.y);
		markerBuffer.writeUInt8(y1, 9);
		markerBuffer.writeUInt8(y2, 10);
		markerBuffer.writeUInt8(y3, 11);
		markerBuffer.writeUInt8(0x18, 12);
		markerBuffer.writeUInt8(marker.z, 13);
		markerBuffer.writeUInt8(0x10, 14);
		const iconByte = icons.byName[marker.icon];
		console.assert(iconByte != null);
		markerBuffer.writeUInt8(iconByte, 15);
		markerBuffer.writeUInt8(0x1A, 16);
		markerBuffer.writeUInt8(encodedDescriptionLength, 17);
		console.assert(
			marker.description.length <= 100,
			'Marker description should be 100 symbols or fewer for the minimap format'
		);
		markerBuffer.write(
			encodedDescription,
			18,
			encodedDescriptionLength,
			'binary'
		);
		markerBuffer.writeUInt8(0x20, 18 + encodedDescriptionLength);
		markerBuffer.writeUInt8(0x00, 19 + encodedDescriptionLength);
		result = Buffer.concat([result, markerBuffer]);
	}
	return result;
};

module.exports = arrayToMinimapMarkerBuffer;
