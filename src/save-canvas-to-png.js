'use strict';

const fs = require('fs');

const saveCanvasToPNG = (fileName, canvas) => {
	return new Promise((resolve, reject) => {
		const writeStream = fs.createWriteStream(fileName);
		const pngStream = canvas.pngStream();
		pngStream.on('data', (chunk) => {
			writeStream.write(chunk)
		});
		pngStream.on('end', () => {
			console.log(`${fileName} created successfully.`);
			resolve();
		});
	});
};

module.exports = saveCanvasToPNG;
