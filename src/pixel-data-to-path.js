'use strict';

const pixelDataToPathBuffer = function(data) {
	const buffer = new Buffer(0x10000);
	let bufferIndex = -1;
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
			// Verify that `r, `g`, and `b` are equal.
			console.assert(r == g);
			console.assert(r == b);
			// Get the byte value that corresponds to this color.
			const byteValue = 0xFF - r;
			buffer.writeUInt8(byteValue, ++bufferIndex);
		}
	}
	return buffer;
};

module.exports = pixelDataToPathBuffer;
