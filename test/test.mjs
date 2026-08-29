import { copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname } from 'node:path';
import { chdir } from 'node:process';
import { fileURLToPath } from 'node:url';
import { serializeMarker, serializeMarkers } from '../src/serialize-markers.mjs';
import { compareDir, compareMarkerFiles, readFile } from './util.mjs';

chdir(dirname(fileURLToPath(import.meta.url)));

// Check if `serializeMarker` correctly formats a single marker object.
const singleMarker = { x: 32070, y: 31165, z: 0, icon: 'down', description: '' };
const serializedSingle = serializeMarker(singleMarker);
const expectedSingle = '\t{ "x": 32070, "y": 31165, "z": 0, "icon": "down", "description": "" }';
if (serializedSingle !== expectedSingle) {
	console.error('Error: `serializeMarker` output does not match expected format!');
	process.exitCode = 1;
}

// Check if `serializeMarkers` correctly formats marker objects.
const sampleMarkers = [
	{ x: 32070, y: 31165, z: 0, icon: 'down', description: '' },
	{ x: 32087, y: 31185, z: 0, icon: 'red right', description: 'Levitate spot' },
];
const serializedSample = serializeMarkers(sampleMarkers);
const expectedSample = '[\n\t{ "x": 32070, "y": 31165, "z": 0, "icon": "down", "description": "" },\n\t{ "x": 32087, "y": 31185, "z": 0, "icon": "red right", "description": "Levitate spot" }\n]\n';
if (serializedSample !== expectedSample) {
	console.error('Error: `serializeMarkers` output does not match expected format!');
	process.exitCode = 1;
}

execSync('npm link');
execSync('tibia-maps --from-minimap=minimap --output-dir=data');

// Check if the generated `markers.json` matches the expected format.
const actualMarkersContent = readFile('data/markers.json').toString('utf8');
const expectedMarkersContent = '[\n\t{ "x": 32064, "y": 31883, "z": 5, "icon": "star", "description": "Foo’s ïñtërnâtiônàlizætiøn workshop" },\n\t{ "x": 32021, "y": 31294, "z": 8, "icon": "flag", "description": "Buddel" },\n\t{ "x": 32098, "y": 31371, "z": 8, "icon": "red down", "description": "Stone Golems" }\n]\n';
if (actualMarkersContent !== expectedMarkersContent) {
	console.error('Error: `data/markers.json` content does not match expected format!');
	process.exitCode = 1;
}


// Check if the generated map files based on the generated PNG and JSON data
// match the original map files, and call out any differences.
execSync('tibia-maps --from-data=data --output-dir=minimap-new');
compareDir('minimap');


// Check if `--overlay-grid` works correctly.
execSync('tibia-maps --from-data=data --output-dir=minimap-grid-new --overlay-grid');
compareDir('minimap-grid');


// Check if `--extra` works correctly.
execSync('tibia-maps --from-data=data --output-dir=minimap-extra-new --extra=achievements');
compareDir('minimap-extra');


// Check if `--no-markers` skips importing the marker data.
execSync('tibia-maps --from-minimap=minimap --output-dir=data-without-markers --no-markers');
const markers = JSON.parse(readFile('data-without-markers/markers.json'));
if (markers.length > 0) {
	console.error('Error: `--no-markers` extracted marker data anyway! (data-without-markers/markers.json)');
	process.exitCode = 1;
}
const emptyMarkersContent = readFile('data-without-markers/markers.json').toString('utf8');
if (emptyMarkersContent !== '[]\n') {
	console.error('Error: `data-without-markers/markers.json` content does not match expected format!');
	process.exitCode = 1;
}


// Check if `--union` works correctly.
copyFileSync('data-union-base/markers.json', 'data-union-new/markers.json');
execSync('tibia-maps --union --markers-only --from-minimap=minimap --output-dir=data-union-new');
compareMarkerFiles('data-union');
const actualUnionMarkersContent = readFile('data-union-new/markers.json').toString('utf8');
const expectedUnionMarkersContent = readFile('data-union/markers.json').toString('utf8');
if (actualUnionMarkersContent !== expectedUnionMarkersContent) {
	console.error('Error: `data-union-new/markers.json` content does not match `data-union/markers.json`!');
	process.exitCode = 1;
}

