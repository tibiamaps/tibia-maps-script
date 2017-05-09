'use strict';

const transposeBuffer = (buffer) => {
	const size = 256;
	const result = [];
	for (let xOffset = 0; xOffset < size; xOffset++) {
		for (let index = xOffset; index < size * size; index += size) {
			result.push(buffer[index]);
		}
	}
	return new Buffer(result);
};

module.exports = transposeBuffer;
