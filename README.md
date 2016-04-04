# `tibia-maps` CLI [![Build status](https://travis-ci.org/tibiamaps/tibia-maps-script.svg?branch=master)](https://travis-ci.org/tibiamaps/tibia-maps-script) [![Dependency status](https://gemnasium.com/tibiamaps/tibia-maps-script.svg)](https://gemnasium.com/tibiamaps/tibia-maps-script)

`tibia-maps` is a command-line utility to convert between binary [Tibia](https://secure.tibia.com/) maps and [human-readable forms of the map data](https://github.com/tibiamaps/tibia-map-data).

## Installation

**Note:** [Node.js v4+](https://nodejs.org/en/) is required.

```sh
npm install -g tibia-maps
```

If you’re on OS X and you’re getting [an error about `xcb-shm`](https://github.com/Automattic/node-canvas/pull/541), try this instead:

```sh
export PKG_CONFIG_PATH="${PKG_CONFIG_PATH}:/opt/X11/lib/pkgconfig"; npm install -g tibia-maps
```

## Usage

### `*.map` → `*.png` + `*.json`

To generate PNGs for the maps + pathfinding visualization and JSON for the marker data based on the map files in the `Automap` directory, run:

```sh
tibia-maps --from-maps=./Automap --output-dir=./data
```

The output is saved in the `data` directory.

### `*.png` + `*.json` → `*.map`

To generate Tibia-compatible `*.map` files based on the PNGs and JSON files in the `data` directory, run:

```sh
tibia-maps --from-data=./data --output-dir=./Automap-new
```

The output is saved in the `Automap-new` directory.

### `*.png` + `*.json` → `*.exp`

To generate [Tibia Flash client–compatible `*.exp` files](https://tibiamaps.io/guides/exp-file-format) based on the PNGs and JSON files in the `data` directory, run:

```sh
tibia-maps --from-data=./data --flash-export-file=./maps.exp
```

The export file is saved as `maps.exp`.

## Author

| [![twitter/mathias](https://gravatar.com/avatar/24e08a9ea84deb17ae121074d0f17125?s=70)](https://twitter.com/mathias "Follow @mathias on Twitter") |
|---|
| [Mathias Bynens](https://mathiasbynens.be/) |
