'use strict';

const fs = require('fs');
const glob = require('glob');
const path = require('path');

const padLeft = require('lodash.padleft');

const writeJSON = require('./write-json.js');

const generateBounds = function(mapsDirectory, dataDirectory) {
	return new Promise(function(resolve, reject) {
		glob(`${mapsDirectory}/*.map`, function(error, files) {
			const bounds = {
				'xMin': +Infinity,
				'xMax': -Infinity,
				'yMin': +Infinity,
				'yMax': -Infinity,
				'zMin': +Infinity,
				'zMax': -Infinity
			};
			const floorIDs = [];
			for (const file of files) {
				const id = path.basename(file);
				const x = Number(id.slice(0, 3));
				const y = Number(id.slice(3, 6));
				const z = Number(id.slice(6, 8));
				if (bounds.xMin > x) {
					bounds.xMin = x;
				}
				if (bounds.xMax < x) {
					bounds.xMax = x;
				}
				if (bounds.yMin > y) {
					bounds.yMin = y;
				}
				if (bounds.yMax < y) {
					bounds.yMax = y;
				}
				if (bounds.zMin > z) {
					bounds.zMin = z;
				}
				if (bounds.zMax < z) {
					bounds.zMax = z;
				}
				const floorID = padLeft(z, 2, '0');
				if (floorIDs.indexOf(floorID) == -1) {
					floorIDs.push(floorID);
				}
			}
			bounds.width = (1 + bounds.xMax - bounds.xMin) * 256;
			bounds.height = (1 + bounds.yMax - bounds.yMin) * 256;
			bounds.floorIDs = floorIDs.sort();
			writeJSON(`${dataDirectory}/bounds.json`, bounds);
			resolve(bounds);
		});
	});
};

module.exports = generateBounds;
