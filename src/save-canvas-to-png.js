'use strict';

const fs = require('fs');

const saveCanvasToPNG = function(fileName, canvas) {
	return new Promise(function(resolve, reject) {
		const writeStream = fs.createWriteStream(fileName);
		const pngStream = canvas.pngStream();
		pngStream.on('data', function(chunk) {
			writeStream.write(chunk);
		});
		pngStream.on('end', function() {
			console.log(`${fileName} created successfully.`);
			resolve();
		});
	});
};

module.exports = saveCanvasToPNG;
