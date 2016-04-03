'use strict';

const windows1252 = require('windows-1252');

const icons = require('./icons.js');

const arrayToFlashMarkers = function(array, floorID) {
	const result = [];
	for (const marker of array) {
		// Note: the property order is important here. This order matches the
		// `*.exp` file format exactly.
		result.push({
			'description': windows1252.encode(marker.description),
			'type': icons.byName[marker.icon],
			'x': marker.xTile * 256 + marker.xPosition,
			'y': marker.yTile * 256 + marker.yPosition,
			'z': Number(floorID)
		});
	}
	return result;
};

module.exports = arrayToFlashMarkers;
