export const iconsById = new Map([
	[0x00, 'checkmark'], // green checkmark ✔
	[0x01, '?'], // blue question mark ❓
	[0x02, '!'], // red exclamation mark ❗
	[0x03, 'star'], // orange star 🟊
	[0x04, 'crossmark'], // bright red crossmark ❌
	[0x05, 'cross'], // dark red cross 🕇
	[0x06, 'mouth'], // mouth with red lips 👄
	[0x07, 'spear'], // spear 🏹
	[0x08, 'sword'], // sword ⚔
	[0x09, 'flag'], // blue flag ⚑
	[0x0a, 'lock'], // golden lock 🔒
	[0x0b, 'bag'], // brown bag 👛
	[0x0c, 'skull'], // skull 💀
	[0x0d, '$'], // green dollar sign 💰💲
	[0x0e, 'red up'], // red arrow up ⬆️🔺
	[0x0f, 'red down'], // red arrow down ⬇🔻
	[0x10, 'red right'], // red arrow right ➡️
	[0x11, 'red left'], // red arrow left ⬅️
	[0x12, 'up'], // green arrow up ⬆
	[0x13, 'down'], // green arrow down ⬇
]);

export const iconsByName = new Map();
for (const [id, name] of iconsById) {
	iconsByName.set(name, id);
}
