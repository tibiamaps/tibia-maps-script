import fs from 'node:fs';

export const saveCanvasToPng = (fileName, canvas) => {
	// Pipe canvas stream to file and resolve only after the write stream finishes flushing.
	return new Promise((resolve, reject) => {
		const writeStream = fs.createWriteStream(fileName);
		const pngStream = canvas.pngStream();
		writeStream.on('finish', resolve);
		writeStream.on('error', reject);
		pngStream.on('error', reject);
		pngStream.pipe(writeStream);
	});
};
