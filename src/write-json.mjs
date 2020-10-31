import fs from 'node:fs';

export const writeJson = (fileName, data) => {
	const writeStream = fs.createWriteStream(fileName);
	const json = JSON.stringify(data, null, '\t');
	writeStream.write(`${json}\n`);
	writeStream.end();
	//console.log(`${fileName} created successfully.`);
};
