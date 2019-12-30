'use strict';

const fs = require('fs');
const glob = require('glob');
const path = require('path');

const writeJson = require('./write-json.js');

const minimapIdToAbsoluteXyz = require('./minimap-id-to-absolute-xyz.js');

const generateBoundsFromMinimap = (mapsDirectory, dataDirectory) => {
	return new Promise((resolve, reject) => {
		glob(`${mapsDirectory}/*.png`, (error, files) => {
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
				const id = path.basename(file, '.png').replace(/^Minimap_(?:Color|WaypointCost)_/, '');
				const coordinates = minimapIdToAbsoluteXyz(id);
				const x = Math.floor(coordinates.x / 256);
				const y = Math.floor(coordinates.y / 256);
				const z = coordinates.z;
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
				const floorID = String(z).padStart(2, '0');
				if (floorIDs.indexOf(floorID) == -1) {
					floorIDs.push(floorID);
				}
			}
			bounds.width = (1 + bounds.xMax - bounds.xMin) * 256;
			bounds.height = (1 + bounds.yMax - bounds.yMin) * 256;
			bounds.floorIDs = floorIDs.sort();
			writeJson(`${dataDirectory}/bounds.json`, bounds);
			resolve(bounds);
		});
	});
};

module.exports = generateBoundsFromMinimap;
