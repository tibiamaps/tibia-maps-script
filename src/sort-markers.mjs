import fs from 'node:fs/promises';
import path from 'node:path';
import { serializeMarkers } from './serialize-markers.mjs';

export const sortMarkers = (markers) => {
	// Sort markers so they start in the top left, then go from top to bottom.
	// Example:
	//     · 2 · 4 · · ·
	//     1 · 3 · · · 7
	//     · · · 5 · 6 ·
	markers.sort((a, b) => {
		// Represent each marker as a number of the form
		//     zz_xxxxx_yyyyy
		//     01_00000_00000
		// and then just compare the numbers.
		return (
			(a.z * 1_00000_00000 + a.x * 1_00000 + a.y) -
			(b.z * 1_00000_00000 + b.x * 1_00000 + b.y)
		);
	});
	return markers;
};

const dedupeMarkers = (markers) => {
	const set = new Set();
	const deduped = [];
	for (const marker of markers) {
		const normalized = {
			x: marker.x,
			y: marker.y,
			z: marker.z,
			icon: marker.icon,
			description: marker.description,
		};
		const hash = `${marker.x}_${marker.y}_${marker.z}_${marker.icon}_${marker.description}`;
		if (set.has(hash)) {
			continue;
		}
		deduped.push(normalized);
		set.add(hash);
	}
	return deduped;
};

export const sortMarkersInFile = async (filePath) => {
	const stat = await fs.stat(filePath);
	const targetPath = stat.isDirectory()
		? path.join(filePath, 'markers.json')
		: filePath;
	const content = await fs.readFile(targetPath, 'utf8');
	const markers = JSON.parse(content);
	const deduped = dedupeMarkers(markers);
	sortMarkers(deduped);
	const serialized = serializeMarkers(deduped);
	await fs.writeFile(targetPath, serialized);
};

