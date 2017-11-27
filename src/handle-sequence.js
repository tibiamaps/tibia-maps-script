'use strict';

const handleSequence = async (array, callback) => {
	for (const item of array) {
		await callback(item);
	}
};

module.exports = handleSequence;
