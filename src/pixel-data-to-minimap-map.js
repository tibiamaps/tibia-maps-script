'use strict';

const colors = require('./colors.js');
const unexploredMapByte = colors.unexploredMapByte;
const pixelDataToBuffer = require('./pixel-data-to-buffer.js');

// Check if the pixel data contains at least one explored map byte.
const hasData = function(data) {
	// https://tibiamaps.io/guides/map-file-format#visual-map-data
	let xIndex = -1;
	while (++xIndex < 256) {
		const xOffset = xIndex * 4;
		let yIndex = -1;
		while (++yIndex < 256) {
			const yOffset = yIndex * 256 * 4;
			const offset = yOffset + xOffset;
			const r = data[offset];
			const g = data[offset + 1];
			const b = data[offset + 2];
			// Discard alpha channel data; it’s always 0xFF anyway.
			//const a = data[offset + 3];
			// Get the byte value that corresponds to this color.
			const id = `${r},${g},${b}`;
			const byteValue = colors.byColor[id];
			console.assert(byteValue != null, `Unknown color ID: ${id}`);
			if (byteValue != unexploredMapByte) {
				return true;
			}
		}
	}
	return false;
};

const pixelDataToMinimapMapBuffer = function(pixels) {
	if (hasData(pixels.data)) {
		return pixelDataToBuffer(pixels);
	}
	return false;
};

module.exports = pixelDataToMinimapMapBuffer;
