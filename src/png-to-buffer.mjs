import { pixelDataToMapBuffer } from './pixel-data-to-map.mjs';
import { pixelDataToPathBuffer } from './pixel-data-to-path.mjs';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const Canvas = require('canvas');
const Image = Canvas.Image;

// Image width and height.
const PIXELS = 256;

const canvas = Canvas.createCanvas(PIXELS, PIXELS);
const context = canvas.getContext('2d');

export const pngToBuffer = (filePath) => {
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
