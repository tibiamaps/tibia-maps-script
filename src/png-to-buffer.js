'use strict';

const Canvas = require('canvas');
const Image = Canvas.Image;

const pixelDataToMapBuffer = require('./pixel-data-to-map.js');
const pixelDataToPathBuffer = require('./pixel-data-to-path.js');

// Image width and height.
const PIXELS = 256;

const canvas = Canvas.createCanvas(PIXELS, PIXELS);
const context = canvas.getContext('2d');

const pngToBuffer = (filePath) => {
	const image = new Image();
	image.src = filePath;
	context.drawImage(image, 0, 0, PIXELS, PIXELS);
	const pixels = context.getImageData(0, 0, PIXELS, PIXELS);
	const isColor = filePath.includes('_Color_');
	if (isColor) {
		return pixelDataToMapBuffer(pixels);
	}
	const isGroundFloor = filePath.endsWith('_7.png');
	return pixelDataToPathBuffer(pixels, isGroundFloor);
};

module.exports = pngToBuffer;
