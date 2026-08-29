const byByte = new Map([
	[0x00, { r: 0, g: 0, b: 0 }], // black (empty)
	[0x0c, { r: 0, g: 102, b: 0 }], // dark green (tree)
	[0x18, { r: 0, g: 204, b: 0 }], // green (grass)
	[0x33, { r: 51, g: 102, b: 153 }], // light blue (water)
	[0x56, { r: 102, g: 102, b: 102 }], // dark gray (rock/mountain)
	[0x72, { r: 153, g: 51, b: 0 }], // dark brown (earth/stalagmite)
	[0x79, { r: 153, g: 102, b: 51 }], // brown (earth)
	[0x81, { r: 153, g: 153, b: 153 }], // gray (stone tile/cobbled pavement)
	[0x8c, { r: 153, g: 255, b: 102 }], // light green (light spot in grassy area)
	[0xb3, { r: 204, g: 255, b: 255 }], // light blue (ice)
	[0xba, { r: 255, g: 51, b: 0 }], // red (wall)
	[0xc0, { r: 255, g: 102, b: 0 }], // orange (lava)
	[0xcf, { r: 255, g: 204, b: 153 }], // beige (sand)
	[0xd2, { r: 255, g: 255, b: 0 }], // yellow (ladder/stairs/hole/…)
	[0xd7, { r: 255, g: 255, b: 255 }], // white (snow)
]);

export const byColor = new Map();
const colorLookup = new Uint8Array(1 << 24).fill(0xff);
for (const [byteValue, color] of byByte) {
	const colorId = `${color.r},${color.g},${color.b}`;
	byColor.set(colorId, byteValue);
	colorLookup[(color.r << 16) | (color.g << 8) | color.b] = byteValue;
}

export const colorToByteValue = (r, g, b) => {
	return colorLookup[(r << 16) | (g << 8) | b];
};

export const unexploredMapByte = 0x00;
export const unexploredMap = byByte.get(unexploredMapByte);
// The Tibia 11 client marks unwalkable paths as yellow.
export const nonWalkablePath = byByte.get(0xd2);
// Pink denotes “unexplored”.
export const unexploredPath = { r: 0xff, g: 0x00, b: 0xff };
// https://github.com/tibiamaps/tibia-map-data/issues/158#issuecomment-858848120
export const unexploredPathByte = 0xfe;
