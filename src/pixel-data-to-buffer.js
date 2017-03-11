'use strict';

const Canvas = require('canvas');

const pixelDataToBuffer = (pixels) => {
	const canvas = new Canvas(256, 256);
	const context = canvas.getContext('2d');
	context.putImageData(pixels, 0, 0);
	const buffer = canvas.toBuffer();
	return buffer;
};

module.exports = pixelDataToBuffer;
