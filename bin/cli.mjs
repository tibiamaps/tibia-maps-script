#!/usr/bin/env node

import { convertToMinimap } from '../src/to-minimap.mjs';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import path from 'node:path';

const argv = require('argh').argv;
import fs from 'node:fs/promises';
const fsp = fs;
const rimraf = require('rimraf');

import { convertFromMinimap } from '../src/from-minimap.mjs';
import { generateBoundsFromMinimap } from '../src/generate-bounds-from-minimap.mjs';
import { sortMarkersInFile } from '../src/sort-markers.mjs';
const info = require('../package.json');

const emptyDirectory = (path) => {
	return new Promise((resolve, reject) => {
		rimraf(`${path}/*`, async () => {
			await fsp.mkdir(path, { recursive: true });
			resolve();
		});
	});
};

const main = async () => {
	const excludeMarkers = argv['markers'] === false;
	const overlayGrid = argv['overlay-grid'] === true;

	if (process.argv.length == 2) {
		console.log(`${info.name} v${info.version} - ${info.homepage}`);
		console.log('\nUsage:\n');
		console.log(`\t${info.name} --from-minimap=./minimap --output-dir=./data`);
		console.log(`\t${info.name} --from-minimap=./minimap --output-dir=./data --markers-only`);
		console.log(`\t${info.name} --from-minimap=./minimap --output-dir=./data --markers-only --union`);
		console.log(`\t${info.name} --from-data=./data --output-dir=./minimap --no-markers`);
		console.log(`\t${info.name} --from-data=./data --output-dir=./minimap-grid --overlay-grid`);
		console.log(`\t${info.name} --from-data=./data --extra=achievements,orcsoberfest --output-dir=./minimap`);
		console.log(`\t${info.name} --sort-markers=./data/markers.json`);
		process.exit(1);
	}

	if (argv['v'] || argv['version']) {
		console.log(`v${info.version}`);
		return process.exit(0);
	}

	const modes = [
		argv['from-minimap'] && '--from-minimap',
		argv['from-data'] && '--from-data',
		argv['sort-markers'] && '--sort-markers',
	].filter(Boolean);

	if (modes.length === 0) {
		console.log('Missing `--from-minimap`, `--from-data`, or `--sort-markers` flag.');
		return process.exit(1);
	}

	if (modes.length > 1) {
		console.log(`Cannot combine \`${modes[0]}\` with \`${modes[1]}\`. Pick one.`);
		return process.exit(1);
	}

	if (argv['sort-markers']) {
		if (argv['sort-markers'] === true) {
			console.log('`--sort-markers` path not specified. Using the default, i.e. `data/markers.json`.');
			argv['sort-markers'] = 'data/markers.json';
		}
		const files = Array.isArray(argv['sort-markers'])
			? argv['sort-markers']
			: [argv['sort-markers']];
		for (const file of files) {
			const targetPath = path.resolve(String(file));
			await sortMarkersInFile(targetPath);
		}
		return;
	}

	if (argv['from-minimap']) {
		if (argv['from-minimap'] === true) {
			console.log('`--from-minimap` path not specified. Using the default, i.e. `minimap`.');
			argv['from-minimap'] = 'minimap';
		}
		const mapsDirectory = path.resolve(String(argv['from-minimap']));
		if (!argv['output-dir'] || argv['output-dir'] === true) {
			console.log('`--output-dir` path not specified. Using the default, i.e. `data`.');
			argv['output-dir'] = 'data';
		}
		const dataDirectory = path.resolve(String(argv['output-dir']));
		const markersOnly = argv['markers-only'];
		if (!markersOnly) {
			await emptyDirectory(dataDirectory);
		}
		const unionMode = argv['union'];
		const bounds = await generateBoundsFromMinimap(mapsDirectory, dataDirectory, !markersOnly);
		await convertFromMinimap(
			bounds, mapsDirectory, dataDirectory, !excludeMarkers, markersOnly, unionMode
		);
		return;
	}

	if (argv['from-data']) {
		if (argv['from-data'] === true) {
			console.log('`--from-data` path not specified. Using the default, i.e. `data`.');
			argv['from-data'] = 'data';
		}

		const dataDirectory = path.resolve(argv['from-data']);
		if (!argv['output-dir'] || argv['output-dir'] === true) {
			console.log('`--output-dir` path not specified. Using the default, i.e. `minimap-new`.');
			argv['output-dir'] = 'minimap-new';
		}

		const extra = (() => {
			if (!argv['extra'] || typeof argv['extra'] !== 'string') {
				return false;
			}
			const ids = argv['extra'].split(',');
			return ids.map(id => path.resolve(dataDirectory, '../extra/', id));
		})();

		const minimapDirectory = path.resolve(String(argv['output-dir']));
		await emptyDirectory(minimapDirectory);
		await convertToMinimap(dataDirectory, minimapDirectory, extra, !excludeMarkers, overlayGrid);
		return;
	}
};

main();
