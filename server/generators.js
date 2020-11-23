var { hsl2Rgb } = require('colorsys');
var fastnoise = require('fastnoisejs');
var fs = require('fs');
var path = require('path');
var { PNG } = require('pngjs');
var Chunk = require('./chunk');

var computeColor = (noise, x, y, z) => {
    var { maxHeight } = Chunk;
    var hsl = {
        h: Math.abs(noise.GetPerlin(x, y * 2, z)) * 360,
        s: 30 + (
            Math.abs(noise.GetSimplex(x * 2, y, z * 2))
        ) * (1 - (y / maxHeight)) * 60,
        l: 30 + (
            Math.abs(noise.GetPerlin(x, y * 2, z))
        ) * 60,
    };
    var color = hsl2Rgb(hsl);
    color.r += Math.floor(Math.random() * hsl.l) - hsl.l * 0.5;
    color.r = Math.min(Math.max(color.r, 0), 0xFF);
    color.g += Math.floor(Math.random() * hsl.l) - hsl.l * 0.5;
    color.g = Math.min(Math.max(color.g, 0), 0xFF);
    color.b += Math.floor(Math.random() * hsl.l) - hsl.l * 0.5;
    color.b = Math.min(Math.max(color.b, 0), 0xFF);
    return color;
};

var Generators = {
    default ({ noise, types }) {
        var { maxHeight, size } = Chunk;
        var waterLevel = 8;
        var saplings = {
            from: waterLevel + 3,
            to: waterLevel + size,
        };
        var seed = noise.GetSeed();
        var spawn = Math.floor(noise.GetWhiteNoise(seed, seed) * 50);
        return {
            saplings: (x, y, z) => {
                if (
                    y < saplings.from ||
                    y > saplings.to ||
                    (Math.abs(noise.GetPerlin(x / 4, y / 4, z / 4))) > 0.1 ||
                    (Math.abs(noise.GetSimplex(z * 4, y * 4, x * 4))) > 0.005
                ) {
                    return false;
                }
                var n = Math.abs(noise.GetSimplex(z / 8, x / 8));
                var height = 5 + Math.floor(Math.abs(noise.GetWhiteNoise(x / 2, z / 2)) * 16);
                var hue = Math.floor(n * 0x100);
                var radius = 7 + Math.floor(n * height * 0.5);
                return {
                    r: height,
                    g: hue,
                    b: radius,
                };
            },
            spawn: { x: spawn, z: spawn },
            terrain: (x, y, z) => {
                var isBlock = y <= (
                    Math.abs(noise.GetSimplexFractal(x / 1.5, y, z / 1.5)) *
                    maxHeight
                );
                var voxel = {
                    type: types.air,
                    color: { r: 0, g: 0, b: 0 },
                };
                if (isBlock || y <= waterLevel) {
                    voxel.type = isBlock ? types.dirt : types.water;
                    voxel.color = computeColor(noise, x, y, z);
                    if (!isBlock) {
                        var avg = Math.floor((voxel.color.r + voxel.color.g + voxel.color.b) / 3);
                        voxel.color.r = avg;
                        voxel.color.g = avg;
                        voxel.color.b = Math.min(Math.floor(avg * 1.5), 0xFF);
                    }
                }
                return voxel;
            },
        };
    },
    flat({ noise, types }) {
        var worldHeight = 3;
        return {
            terrain: (x, y, z) => {
                var isBlock = y <= worldHeight;
                return {
                    type: isBlock ? types.dirt : types.air,
                    color: isBlock ? computeColor(noise, x, y, z) : { r: 0, g: 0, b: 0 },
                };
            },
        };
    },
    heightmap({ noise, types }) {
        if (!process.env.HEIGHTMAP) {
            console.error('Must provide a HEIGHTMAP if you want to use the heightmap generator.\n');
            process.exit(1);
        }
        var { maxHeight } = Chunk;
        var waterLevel = 6;
        var heightmap = PNG.sync.read(fs.readFileSync(process.env.HEIGHTMAP));
        var heightOffset = {
            x: Math.floor(heightmap.width * 0.5),
            z: Math.floor(heightmap.height * 0.5),
        };
        var scale = maxHeight / 0xFF;
        var colormap = process.env.COLORMAP ? (
            PNG.sync.read(fs.readFileSync(process.env.COLORMAP))
        ) : false;
        var colorOffset = colormap ? {
            x: Math.floor(colormap.width * 0.5),
            z: Math.floor(colormap.height * 0.5),
        } : false;
        var getColor = (x, y, z) => {
            var cx = colorOffset.x + x;
            var cz = colorOffset.z + z;
            if (cx >= 0 && cx < colormap.width && cz >= 0 && cz < colormap.height) {
                var index = ((colormap.width * cz) + cx) * 4;
                return {
                    r: colormap.data[index],
                    g: colormap.data[index + 1],
                    b: colormap.data[index + 2],
                };
            }
            return computeColor(noise, x, y, z);
        };
        return {
            terrain: (x, y, z) => {
                var hx = heightOffset.x + x;
                var hz = heightOffset.z + z;
                var height = 0;
                if (hx >= 0 && hx < heightmap.width && hz >= 0 && hz < heightmap.height) {
                    height = Math.floor(heightmap.data[((heightmap.width * hz) + hx) * 4] * scale);
                }
                var isBlock = y <= height;
                var voxel = {
                    type: types.air,
                    color: { r: 0, g: 0, b: 0 },
                };
                if (isBlock || y <= waterLevel) {
                    voxel.type = isBlock ? types.dirt : types.water;
                    voxel.color = isBlock && colormap ? getColor(x, y, z) : computeColor(noise, x, y, z);
                    if (!isBlock) {
                        var avg = Math.floor((voxel.color.r + voxel.color.g + voxel.color.b) / 3);
                        voxel.color.r = avg;
                        voxel.color.g = avg;
                        voxel.color.b = Math.min(Math.floor(avg * 1.5), 0xFF);
                    }
                }
                return voxel;
            },
        };
    },
};

var LoadBlockTypes = (basePath) => {
    var blockTypes = {
        air: 0,
        0: { isTransparent: true },
    };
    /* eslint-disable import/no-dynamic-require, global-require */
    var types = require(basePath);
    var textures = [];
    types.forEach((type, i) => {
        var model = require(path.join(basePath, 'models', type));
        Object.keys(model.textures).forEach((id) => {
            var texture = model.textures[id];
            var index = textures.findIndex(({ name }) => (name === texture));
            if (index === -1) {
                index = textures.length;
                var image;
                switch (path.extname(texture)) {
                    case '.js':
                        image = require(path.join(basePath, 'textures', texture));
                        break;
                    case '.png':
                        image = PNG.sync.read(fs.readFileSync(path.join(basePath, 'textures', texture)));
                        break;
                    default:
                        console.error(`Texture: ${texture} format not supported.\n`);
                        process.exit(1);
                }
                image.name = texture;
                textures.push(image);
            }
            model.textures[id] = index;
        });
        var index = i + 1;
        blockTypes[index] = model;
        blockTypes[type] = index;
    });
    /* eslint-enable import/no-dynamic-require, global-require */
    var { width, height } = textures[0];
    var atlas = new PNG({
        width: width * textures.length,
        height,
        colorType: 6, // RGBA
    });
    textures.forEach((texture, i) => {
        PNG.bitblt(texture, atlas, 0, 0, texture.width, texture.height, width * i, 0);
    });
    var client; {
        var air = { type: blockTypes.air };
        var empty = {
            neighbors: {
                get: () => air,
                top: air,
                bottom: air,
                south: air,
                north: air,
                west: air,
                east: air,
            },
            types: blockTypes,
        };
        client = types
            .reduce((types, v, index) => {
                var type = index + 1;
                if (type !== blockTypes.sapling) {
                    var { name, faces, textures } = blockTypes[type];
                    types.push({
                        id: type,
                        name,
                        faces: faces({
                            ...empty,
                            voxel: { type },
                        }),
                        textures,
                    });
                }
                return types;
            }, []);
    }
    return {
        atlas: PNG.sync.write(atlas),
        client,
        types: blockTypes,
    };
};

module.exports = ({ blockTypes, generator, seed }) => {
    var noise = fastnoise.Create(seed);
    var { atlas, client, types } = LoadBlockTypes(path.resolve(blockTypes));
    if (Generators[generator]) {
        generator = Generators[generator]({ noise, types });
    } else if (fs.existsSync(generator)) {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        generator = require(path.resolve(generator))({ noise, types });
    } else {
        console.error(`Couldn't find the generator "${generator}".\n`);
        process.exit(1);
    }
    return {
        ...generator,
        atlas,
        client,
        noise,
        spawn: generator.spawn || { x: 0, z: 0 },
        types,
    };
};