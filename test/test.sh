#!/usr/bin/env bash

# This script checks if the generated map files based on the generated PNG and
# JSON data match the original map files, and calls out any differences.
# Use it after roundtripping, i.e.:
#
# $ tibia-maps --from-maps && tibia-maps --to-maps

# Enable writing paths relative to the `test` folder.
cd "$(dirname "${BASH_SOURCE}")";

npm link > /dev/null;
tibia-maps --from-maps=./maps --output-dir=./data;
tibia-maps --from-data=./data --output-dir=./maps-new;

for file in maps/*.map; do
	f=$(basename "${file}");
	[ -f "maps-new/${f}" ] || echo "Missing file: ${f}";
	expected=$(md5 -q "maps/${f}");
	actual=$(md5 -q "maps-new/${f}");
	if [ "${expected}" != "${actual}" ]; then
		echo "MD5 mismatch: ${f}";
		# Show the first few bytes that differ.
		cmp -l {maps,maps-new}/"${f}" | \
			gawk '{printf "%08X %02X %02X\n", $1, strtonum(0$2), strtonum(0$3)}' | \
			head -n 5;
		exit 1;
	fi;
done;
