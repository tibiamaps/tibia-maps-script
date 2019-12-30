'use strict';

const minimapIdToAbsoluteXyz = (id) => {
	const [x, y, z] = id.split('_').map((string) => Number(string));
	return { x, y, z };
};

module.exports = minimapIdToAbsoluteXyz;
