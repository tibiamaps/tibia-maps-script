'use strict';

const handleSequence = function(array, callback) {
	return array.reduce(function(promise, item) {
		return promise.then(function() {
			return callback(item);
		});
	}, Promise.resolve());
};

module.exports = handleSequence;
