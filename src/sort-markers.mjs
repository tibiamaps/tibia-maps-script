export const sortMarkers = (markers) => {
	// Sort markers so they start in the top left, then go from top to bottom.
	// Example:
	//     · 2 · 4 · · ·
	//     1 · 3 · · · 7
	//     · · · 5 · 6 ·
	markers.sort((a, b) => {
		// Represent each marker as a number of the form
		//     zz_xxxxx_yyyyy
		//     01_00000_00000
		// and then just compare the numbers.
		return (
			(a.z * 1_00000_00000 + a.x * 1_00000 + a.y) -
			(b.z * 1_00000_00000 + b.x * 1_00000 + b.y)
		);
	});
	return markers;
};
