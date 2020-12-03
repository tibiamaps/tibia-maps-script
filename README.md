# `tibia-maps` CLI [![Build status](https://travis-ci.org/tibiamaps/tibia-maps-script.svg?branch=main)](https://travis-ci.org/tibiamaps/tibia-maps-script)

`tibia-maps` is a command-line utility to convert between binary [Tibia](https://www.tibia.com/) maps and [human-readable forms of the map data](https://github.com/tibiamaps/tibia-map-data).

## Installation

**Note:** Use the [expected](https://github.com/tibiamaps/tibia-maps-script/blob/main/.nvmrc) Node.js version!

```sh
npm install -g github:tibiamaps/tibia-maps-script
```

If you’re on macOS and you get [an error about `xcb-shm`](https://github.com/Automattic/node-canvas/pull/541), try this instead:

```sh
export PKG_CONFIG_PATH="${PKG_CONFIG_PATH}:/opt/X11/lib/pkgconfig"; npm install -g tibia-maps
```

## Usage

### `minimap/*` → `data/*`

To generate PNGs for the maps + pathfinding visualization and JSON for the marker data based on the map files in the `minimap` directory, run:

```sh
tibia-maps --from-minimap=./minimap --output-dir=./data
```

The output is saved in the `data` directory.

### `data/*` → `minimap/*`

To generate Tibia-compatible `minimap/*` files based on the PNGs and JSON files in the `data` directory, run:

```sh
tibia-maps --from-data=./data --output-dir=./minimap-new
```

The output is saved in the `minimap-new` directory.

## Author

| [![twitter/mathias](https://gravatar.com/avatar/24e08a9ea84deb17ae121074d0f17125?s=70)](https://twitter.com/mathias "Follow @mathias on Twitter") |
|---|
| [Mathias Bynens](https://mathiasbynens.be/) |
