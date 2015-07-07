#!/usr/bin/env node

'use strict';

const path = require('path');

const argv = require('argh').argv;
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

const convertFromMaps = require('../src/from-maps.js');
const convertToMaps = require('../src/to-maps.js');
const generateBounds = require('../src/generate-bounds.js');

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
		const mapsDirectory = path.resolve(argv['from-maps']);
		if (!argv['output-dir'] || argv['output-dir'] === true) {
			console.log('`--output-dir` path not specified. Using the default, i.e. `data`.');
			argv['output-dir'] = 'data';
		}
		const dataDirectory = path.resolve(argv['output-dir']);
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
		if (!argv['output-dir'] || argv['output-dir'] === true) {
			console.log('`--output-dir` path not specified. Using the default, i.e. `Automap-new`.');
			argv['output-dir'] = 'Automap-new';
		}
		const outputDirectory = path.resolve(argv['output-dir']);
		emptyDirectory(outputDirectory).then(function() {
			convertToMaps(dataDirectory, outputDirectory, !excludeMarkers);
		});
		return;
	}
};

main();
