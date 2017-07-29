'use strict';

const handleSequence = (array, callback) => {
	return array.reduce((promise, item) => {
		return promise.then(() => callback(item));
	}, Promise.resolve());
};

module.exports = handleSequence;
