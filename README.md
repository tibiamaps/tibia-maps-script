# `tibia-maps` CLI

`tibia-maps` is a command-line utility to convert between binary [Tibia](https://secure.tibia.com/) maps and human-readable forms of the map data.

## Installation

**Note:** [io.js](https://iojs.org/en/) is required.

```sh
npm install -g tibia-maps
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
