#!/usr/bin/env node

'use strict';

const path = require('path');

const argv = require('argh').argv;
const fsp = require('fs').promises;
const rimraf = require('rimraf');

const convertFromMinimap = require('../src/from-minimap.js');
const convertToMinimap = require('../src/to-minimap.js');
const generateBoundsFromMinimap = require('../src/generate-bounds-from-minimap.js');
const info = require('../package.json');

const emptyDirectory = (path) => {
	return new Promise((resolve, reject) => {
		rimraf(`${path}/*`, () => {
			fsp.mkdir(path, { recursive: true }).then(() => {
				resolve();
			});
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
		console.log(`\t${info.name} --from-data=./data --output-dir=./minimap --no-markers`);
		console.log(`\t${info.name} --from-data=./data --output-dir=./minimap-grid --overlay-grid`);
		console.log(`\t${info.name} --from-data=./data --extra=achievements,Orcsoberfest --output-dir=./minimap`);
		process.exit(1);
	}

	if (argv['v'] || argv['version']) {
		console.log(`v${info.version}`);
		return process.exit(0);
	}

	if (!argv['from-minimap'] && !argv['from-data']) {
		console.log('Missing `--from-minimap` or `--from-data` flag.');
		return process.exit(1);
	}

	if (argv['from-minimap'] && argv['from-data']) {
		console.log('Cannot combine `--from-minimap` with `--from-data`. Pick one.');
		return process.exit(1);
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
		const bounds = await generateBoundsFromMinimap(mapsDirectory, dataDirectory, !markersOnly);
		convertFromMinimap(
			bounds, mapsDirectory, dataDirectory, !excludeMarkers, markersOnly
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
