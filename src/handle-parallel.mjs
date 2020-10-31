export const handleParallel = (array, callback) => {
	const promises = array.map(element => callback(element));
	return Promise.all(promises);
};
