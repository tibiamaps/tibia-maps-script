'use strict';

const icons = require('./icons.js');

const arrayToFlashMarkers = function(array, floorID) {
	const result = [];
	for (const marker of array) {
		// Note: the property order is important here. This order matches the
		// `*.exp` file format exactly.
		result.push({
			// Note that `*.exp` files created by the C++ Tibia client replace
			// any non-ASCII symbols with `?`. We could do that here as well, but
			// since the migration tool handles such symbols just fine, why bother?
			'description': marker.description,
			'type': icons.byName[marker.icon],
			'x': marker.xTile * 256 + marker.xPosition,
			'y': marker.yTile * 256 + marker.yPosition,
			'z': Number(floorID)
		});
	}
	return result;
};

module.exports = arrayToFlashMarkers;
