'use strict';

const colors = require('./colors.js');
const nonWalkablePath = colors.nonWalkablePath;
const unexploredPath = colors.unexploredPath;
const unexploredPathByte = colors.unexploredPathByte;
const pixelDataToBuffer = require('./pixel-data-to-buffer.js');

// Check if the pathfinding data contains at least one explored map byte.
const hasData = function(data, isGroundFloor) {
	// https://tibiamaps.io/guides/map-file-format#pathfinding-data
	if (isGroundFloor) {
		return true;
	}
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
			let byteValue;
			if (
				r == unexploredPath.r &&
				b == unexploredPath.b &&
				g == unexploredPath.g
			) {
				byteValue = unexploredPathByte;
			} else {
				// Verify that `r, `g`, and `b` are either equal or the non-walkable
				// color.
				console.assert(
					(r == g && r == b) ||
					(
						r == nonWalkablePath.r &&
						g == nonWalkablePath.g &&
						b == nonWalkablePath.b
					)
				);
				return true;
			}
		}
	}
	return false;
};

const pixelDataToMinimapPathBuffer = function(pixels) {
	if (hasData(pixels.data)) {
		return pixelDataToBuffer(pixels);
	}
	return false;
};

module.exports = pixelDataToMinimapPathBuffer;
