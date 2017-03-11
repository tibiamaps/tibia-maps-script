'use strict';

const windows1252 = require('windows-1252');

const icons = require('./icons.js');

const arrayToFlashMarkers = (array) => {
	const result = [];
	for (const marker of array) {
		// Note: the property order is important here. This order matches the
		// `*.exp` file format exactly.
		result.push({
			'description': windows1252.encode(marker.description),
			'type': icons.byName[marker.icon],
			'x': marker.x,
			'y': marker.y,
			'z': marker.z
		});
	}
	return result;
};

module.exports = arrayToFlashMarkers;
