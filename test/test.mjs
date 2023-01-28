import { copyFileSync, fstat } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname } from 'node:path';
import { chdir } from 'node:process';
import { fileURLToPath } from 'node:url';
import { compareDir, compareMarkerFiles, readFile } from './util.mjs';

chdir(dirname(fileURLToPath(import.meta.url)));

execSync('npm link');
execSync('tibia-maps --from-minimap=minimap --output-dir=data');


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
}


// Check if `--union` works correctly.
copyFileSync('data-union-base/markers.json', 'data-union-new/markers.json');
execSync('tibia-maps --union --markers-only --from-minimap=minimap --output-dir=data-union-new');
compareMarkerFiles('data-union');
