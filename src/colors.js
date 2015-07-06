'use strict';

const byByte = {
	0x00: { r: 0, g: 0, b: 0 }, // black (empty)
	0x0C: { r: 0, g: 102, b: 0 }, // dark green (trees)
	0x18: { r: 0, g: 204, b: 0 }, // green (grass)
	0x1E: { r: 0, g: 255, b: 0 }, // light green (old swamp)
	0x28: { r: 51, g: 0, b: 204 }, // blue (old water)
	0x33: { r: 51, g: 102, b: 153 }, // light blue
	0x56: { r: 102, g: 102, b: 102 }, // dark gray (stone/mountains)
	0x72: { r: 153, g: 51, b: 0 }, // dark brown (earth/stalagmites)
	0x79: { r: 153, g: 102, b: 51 }, // brown (earth)
	0x81: { r: 153, g: 153, b: 153 }, // gray (floor)
	0x8C: { r: 153, g: 255, b: 102 }, // light green
	0xB3: { r: 204, g: 255, b: 255 }, // light blue (ice)
	0xBA: { r: 255, g: 51, b: 0 }, // red (city/walls)
	0xC0: { r: 255, g: 102, b: 0 }, // orange (lava)
	0xCF: { r: 255, g: 204, b: 153 }, // beige (sand)
	0xD2: { r: 255, g: 255, b: 0 }, // yellow (ladders/holes/…)
	0xD7: { r: 255, g: 255, b: 255 } // white (snow / target?)
};

const byColor = {};
Object.keys(byByte).forEach(function(key) {
	const byteValue = Number(key);
	const color = byByte[byteValue];
	const id = `${color.r},${color.g},${color.b}`;
	byColor[id] = byteValue;
});

module.exports = {
	'byByte': byByte,
	'byColor': byColor
};
