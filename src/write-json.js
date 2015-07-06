'use strict';

const fs = require('fs');

const writeJSON = function(fileName, data) {
	const writeStream = fs.createWriteStream(fileName);
	const json = JSON.stringify(data, null, '\t');
	writeStream.write(`${json}\n`);
	writeStream.end();
	console.log(`${fileName} created successfully.`);
};

module.exports = writeJSON;
