const byID = {
	'0': 'checkmark', // green checkmark ✔
	'1': '?', // blue question mark ❓
	'2': '!', // red exclamation mark ❗
	'3': 'star', // orange star 🟊
	'4': 'crossmark', // bright red crossmark ❌
	'5': 'cross', // dark red cross 🕇
	'6': 'mouth', // mouth with red lips 👄
	'7': 'shovel', // shovel ⛏
	'8': 'sword', // sword ⚔
	'9': 'flag', // blue flag ⚑
	'10': 'lock', // golden lock 🔒
	'11': 'bag', // brown bag 👛
	'12': 'skull', // skull 💀
	'13': '$', // green dollar sign 💰💲
	'14': 'red up', // red arrow up ⬆️🔺
	'15': 'red down', // red arrow down ⬇🔻
	'16': 'red right', // red arrow right ➡️
	'17': 'red left', // red arrow left ⬅️
	'18': 'up', // green arrow up ⬆
	'19': 'down' // green arrow down ⬇
};

const byName = {};
Object.keys(byID).forEach(function(id) {
	const name = byID[id];
	byName[name] = Number(id);
});

module.exports = {
	byID: byID,
	byName: byName
};
