var { PNG } = require('pngjs');
var Chunk = require('./chunk');

class Map {
    constructor({ world }) {
        this.world = world;
    }

    onRequest(req, res) {
        var { world } = this;
        var {
            maxHeight,
            size,
        } = Chunk;
        var { getGrid, maxRadius } = Map;
        var origin = (req.params.originX !== undefined && req.params.originZ !== undefined) ? ({
            x: parseInt(req.params.originX, 10),
            z: parseInt(req.params.originZ, 10),
        }) : ({
            x: world.generator.spawn.x,
            z: world.generator.spawn.z,
        });
        var radius = Math.min(
            Math.max(
                parseInt(req.params.radius || 8, 10),
                1
            ),
            maxRadius
        );
        var grid = getGrid(radius);
        var image = new PNG({
            width: (size * ((radius * 2) + 1)) * 2,
            height: (size * ((radius * 2) + 1)) * 2,
            colorType: 2, // color, no alpha
            inputColorType: 2, // color, no alpha
        });
        var renderChunks = () => {
            if (!grid.length) {
                res
                    .set('Cache-Control', 'public, max-age=0')
                    .type('image/png');
                image.pack().pipe(res);
                return;
            }
            var chunk = grid.shift();
            var map = {
                x: (chunk.x + radius) * size,
                z: (chunk.z + radius) * size,
            };
            var { voxels, heightmap } = world.getChunk({
                x: origin.x + chunk.x,
                z: origin.z + chunk.z,
            });
            var height = (x, z) => (
                (x < 0 || x >= size || z < 0 || z >= size) ? (
                    0xFF
                ) : (
                    heightmap[(x * size) + z]
                )
            );
            for (var x = 0; x < size; x += 1) {
                for (var z = 0; z < size; z += 1) {
                    var y = Math.min(height(x, z), maxHeight - 1);
                    var voxel = Chunk.getVoxel(x, y, z);
                    var pixel = {
                        x: (map.x + x) * 2,
                        z: (map.z + z) * 2,
                        r: voxels[voxel + Chunk.fields.r],
                        g: voxels[voxel + Chunk.fields.g],
                        b: voxels[voxel + Chunk.fields.b],
                    };
                    for (var v = 0; v < 4; v += 1) {
                        var ao = 1;
                        switch (v) {
                            case 0:
                                if (height(x - 1, z - 1) > y) ao -= 0.1;
                                if (height(x - 1, z) > y) ao -= 0.1;
                                if (height(x, z - 1) > y) ao -= 0.1;
                                break;
                            case 1:
                                if (height(x + 1, z - 1) > y) ao -= 0.1;
                                if (height(x + 1, z) > y) ao -= 0.1;
                                if (height(x, z - 1) > y) ao -= 0.1;
                                break;
                            case 2:
                                if (height(x - 1, z + 1) > y) ao -= 0.1;
                                if (height(x - 1, z) > y) ao -= 0.1;
                                if (height(x, z + 1) > y) ao -= 0.1;
                                break;
                            case 3:
                                if (height(x + 1, z + 1) > y) ao -= 0.1;
                                if (height(x + 1, z) > y) ao -= 0.1;
                                if (height(x, z + 1) > y) ao -= 0.1;
                                break;
                            default:
                                break;
                        }
                        var offset = (
                            (image.width * (pixel.z + Math.floor(v / 2))) +
                            (pixel.x + (v % 2))
                        ) * 3;
                        image.data[offset] = pixel.r * ao;
                        image.data[offset + 1] = pixel.g * ao;
                        image.data[offset + 2] = pixel.b * ao;
                    }
                }
            }
            world.unloadChunks();
            process.nextTick(renderChunks);
        };
        renderChunks();
    }

    static getGrid(radius) {
        var grid = [];
        for (var z = -radius; z <= radius; z += 1) {
            for (var x = -radius; x <= radius; x += 1) {
                grid.push({ x, z });
            }
        }
        return grid;
    }
}

Map.maxRadius = 10;

module.exports = Map;