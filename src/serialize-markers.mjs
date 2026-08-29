export const serializeMarker = (marker) => {
	const x = JSON.stringify(marker.x);
	const y = JSON.stringify(marker.y);
	const z = JSON.stringify(marker.z);
	const icon = JSON.stringify(marker.icon);
	const description = JSON.stringify(marker.description);
	return `{ "x": ${x}, "y": ${y}, "z": ${z}, "icon": ${icon}, "description": ${description} }`;
};

export const serializeMarkers = (markers = []) => {
	if (markers.length === 0) {
		return '[]\n';
	}
	const lines = markers.map(serializeMarker);
	return `[\n\t${lines.join(',\n\t')}\n]\n`;
};
