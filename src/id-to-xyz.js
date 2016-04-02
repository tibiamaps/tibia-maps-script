'use strict';

const idToXyz = function(id) {
	const x = Number(id.slice(0, 3));
	const y = Number(id.slice(3, 6));
	const z = Number(id.slice(6, 8));
	return { x, y, z };
};

module.exports = idToXyz;
