#!/usr/bin/env node

'use strict';

const path = require('path');

const argv = require('argh').argv;
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

const convertFromMaps = require('../src/from-maps.js');
const convertToMaps = require('../src/to-maps.js');
const convertToFlash = require('../src/to-flash.js');
const generateBounds = require('../src/generate-bounds.js');
const info = require('../package.json');

const emptyDirectory = function(path) {
	return new Promise(function(resolve, reject) {
		rimraf(`${path}/*`, function() {
			mkdirp(path, function() {
				resolve();
			});
		});
	});
};

const main = function() {
	const excludeMarkers = argv['markers'] === false;

	if (process.argv.length == 2) {
		console.log(`${info.name} v${info.version} - ${info.homepage}`);
		console.log('\nUsage:\n');
		console.log(`\t${info.name} --from-maps=./Automap --output-dir=./data`);
		console.log(`\t${info.name} --from-data=./data --output-dir=./Automap --no-markers`);
		process.exit(1);
	}

	if (argv['v'] || argv['version']) {
		console.log(`v${info.version}`);
		return process.exit(0);
	}

	if (!argv['from-maps'] && !argv['from-data']) {
		console.log('Missing `--from-maps` or `--from-data` flag.');
		return process.exit(1);
	}

	if (argv['from-maps'] && argv['from-data']) {
		console.log('Cannot use `--from-maps` and `--from-data` at the same time. Pick one.');
		return process.exit(1);
	}

	if (argv['from-maps']) {
		if (argv['from-maps'] === true) {
			console.log('`--from-maps` path not specified. Using the default, i.e. `Automap`.');
			argv['from-maps'] = 'Automap';
		}
		const mapsDirectory = path.resolve(String(argv['from-maps']));
		if (!argv['output-dir'] || argv['output-dir'] === true) {
			console.log('`--output-dir` path not specified. Using the default, i.e. `data`.');
			argv['output-dir'] = 'data';
		}
		const dataDirectory = path.resolve(String(argv['output-dir']));
		emptyDirectory(dataDirectory).then(function() {
			return generateBounds(mapsDirectory, dataDirectory);
		}).then(function(bounds) {
			return convertFromMaps(bounds, mapsDirectory, dataDirectory, !excludeMarkers);
		});
		return;
	}

	if (argv['from-data']) {
		if (argv['from-data'] === true) {
			console.log('`--from-data` path not specified. Using the default, i.e. `data`.');
			argv['from-data'] = 'data';
		}
		const dataDirectory = path.resolve(argv['from-data']);

		if (argv['flash'] === true) {
			if (!argv['output-file'] || argv['output-file'] === true) {
				console.log('`--output-file` path not specified.');
				return process.exit(1);
			}
			convertToFlash(dataDirectory, argv['output-file'], !excludeMarkers);
			return;
		}

		if (!argv['output-dir'] || argv['output-dir'] === true) {
			console.log('`--output-dir` path not specified. Using the default, i.e. `Automap-new`.');
			argv['output-dir'] = 'Automap-new';
		}
		const mapsDirectory = path.resolve(String(argv['output-dir']));
		emptyDirectory(mapsDirectory).then(function() {
			convertToMaps(dataDirectory, mapsDirectory, !excludeMarkers);
		});
		return;
	}
};

main();
