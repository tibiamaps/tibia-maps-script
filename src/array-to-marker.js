'use strict';

const windows1252 = require('windows-1252');

const icons = require('./icons.js');

const arrayToMarkerBuffer = function(array) {
	let result = new Buffer(4);
	result.writeUIntLE(array.length, 0x0, 4);
	for (const marker of array) {
		const markerBuffer = new Buffer(14 + marker.description.length);
		markerBuffer.writeUInt8(marker.xPosition, 0x0);
		markerBuffer.writeUInt8(marker.xTile, 0x1);
		markerBuffer.write('\0\0', 0x2, 2, 'utf8');
		markerBuffer.writeUInt8(marker.yPosition, 0x4);
		markerBuffer.writeUInt8(marker.yTile, 0x5);
		markerBuffer.write('\0\0', 0x6, 2, 'utf8');
		const iconByte = icons.byName[marker.icon];
		console.assert(iconByte != null);
		markerBuffer.writeUIntLE(iconByte, 0x8, 4);
		markerBuffer.writeUIntLE(marker.description.length, 0xC, 2);
		markerBuffer.write(
			windows1252.encode(marker.description),
			0xE,
			marker.description.length,
			'binary'
		);
		result = Buffer.concat([result, markerBuffer]);
	}
	return result;
};

module.exports = arrayToMarkerBuffer;
