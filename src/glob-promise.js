'use strict';

const _glob = require('glob');

const glob = (pattern) => {
	return new Promise((resolve, reject) => {
		_glob(pattern, (error, files) => {
			if (error) {
				console.log(error);
				reject(error);
			}
			resolve(files);
		});
	});
};

module.exports = glob;
