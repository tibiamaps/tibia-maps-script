const byByte = new Map([
	[0x00, { r:   0, g:   0, b:   0 }], // black (empty)
	[0x0C, { r:   0, g: 102, b:   0 }], // dark green (tree)
	[0x18, { r:   0, g: 204, b:   0 }], // green (grass)
	[0x33, { r:  51, g: 102, b: 153 }], // light blue (water)
	[0x56, { r: 102, g: 102, b: 102 }], // dark gray (rock/mountain)
	[0x72, { r: 153, g:  51, b:   0 }], // dark brown (earth/stalagmite)
	[0x79, { r: 153, g: 102, b:  51 }], // brown (earth)
	[0x81, { r: 153, g: 153, b: 153 }], // gray (stone tile/cobbled pavement)
	[0x8C, { r: 153, g: 255, b: 102 }], // light green (light spot in grassy area)
	[0xB3, { r: 204, g: 255, b: 255 }], // light blue (ice)
	[0xBA, { r: 255, g:  51, b:   0 }], // red (wall)
	[0xC0, { r: 255, g: 102, b:   0 }], // orange (lava)
	[0xCF, { r: 255, g: 204, b: 153 }], // beige (sand)
	[0xD2, { r: 255, g: 255, b:   0 }], // yellow (ladder/stairs/hole/…)
	[0xD7, { r: 255, g: 255, b: 255 }], // white (snow)
]);

export const byColor = new Map();
for (const [byteValue, color] of byByte) {
	const colorId = `${color.r},${color.g},${color.b}`;
	byColor.set(colorId, byteValue);
}

export const unexploredMapByte = 0x00;
export const unexploredMap = byByte.get(unexploredMapByte);
// The Tibia 11 client marks unwalkable paths as yellow.
export const nonWalkablePath = byByte.get(0xD2);
// Pink denotes “unexplored”.
export const unexploredPath = { r: 0xFF, g: 0x00, b: 0xFF };
// https://github.com/tibiamaps/tibia-map-data/issues/158#issuecomment-858848120
export const unexploredPathByte = 0xFE;
