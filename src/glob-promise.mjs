import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const _glob = require('glob');

export const glob = (pattern) => {
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
