import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

export function compareDir(dir, newDir = `${dir}-new`, extensions = ['png', 'bin']) {
	for (const file of readdirSync(dir)) {
		if (extensions.some(ext => file.endsWith(`.${ext}`))) {
			compare(`${dir}/${file}`, `${newDir}/${file}`);
		}
	}
}

export function readFile(file) {
	try {
		return readFileSync(file);
	} catch (e) {
		return null;
	}
}

function compare(file1, file2) {
	const buffer1 = readFile(file1);
	if (!buffer1) {
		console.error(`Missing file ${file1}`);
		return false;
	}

	const buffer2 = readFile(file2);
	if (!buffer2) {
		console.error(`Missing file ${file2}`);
		return false;
	}

	const hash1 = md5(buffer1);
	const hash2 = md5(buffer2);

	if (hash1 !== hash2) {
		console.error(`MD5 mismatch: ${hash1} vs. ${hash2}`);

		const diffBytes = [];
		for (let i = 0; i < Math.max(buffer1.length, buffer2.length); i++) {
			const byte1 = buffer1[i];
			const byte2 = buffer2[i];

			if (byte1 !== byte2) {
				diffBytes.push([i, byte1, byte2]);

				if (diffBytes.length >= 5) {
					break;
				}
			}
		}

		for (const diffByte of diffBytes) {
			const [byteNumber, byte1, byte2] = diffByte;
			console.info(toHex(byteNumber, 8), toHex(byte1), toHex(byte2));
		}

		return false;
	}

	return true;
}

function md5(buffer) {
	return createHash('md5')
		.update(buffer)
		.digest('hex');
}

function toHex(byte, padding = 2) {
	return byte?.toString(16)
		.padStart(padding, '0')
		.toUpperCase() ?? '--';
}
