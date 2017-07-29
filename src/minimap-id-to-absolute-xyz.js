'use strict';

const minimapIdToAbsoluteXyz = (id) => {
	id = id
		.replace(/^Minimap_(Color|WaypointCost)_/, '')
		.replace(/\.png$/, '');
	const [x, y, z] = id.split('_').map((string) => Number(string));
	return { x, y, z };
};

module.exports = minimapIdToAbsoluteXyz;
