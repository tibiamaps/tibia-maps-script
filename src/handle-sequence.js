'use strict';

const handleSequence = async (array, callback) => {
	for (const item of array) {
		await callback(item);
	}
};

const handleParallel = (array, callback) => {
	const promises = array.map(element => callback(element));
	return Promise.all(promises);
};

module.exports = {
	handleSequence,
	handleParallel,
};
