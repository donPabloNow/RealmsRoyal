/*
This code is begging for a refactor.
It has gone through a bunch of patches
and it's pretty horrible.. but, also:
It works and it's reasonably fast.
So.. for now I just going to keep it
in this file, hidden out of my sight.
*/
module.exports = ({
    get,
    from,
    to,
    types,
}) => {
    var getLightingAO = ({ light, sunlight }, neighbors) => neighbors.map((neighbors) => {
        var n1 = types[neighbors[0].type].hasAO;
        var n2 = types[neighbors[1].type].hasAO;
        var n3 = (n1 && n2) || (types[neighbors[2].type].hasAO);
        var ao = [n1, n2, n3].reduce((ao, n) => (
            ao - (n ? 0.2 : 0)
        ), 1);
        var c = 1;
        var l = light;
        var s = sunlight;
        n1 = types[neighbors[0].type].isTransparent;
        n2 = types[neighbors[1].type].isTransparent;
        n3 = (n1 || n2) && types[neighbors[2].type].isTransparent;
        [n1, n2, n3].forEach((n, i) => {
            if (n) {
                l += neighbors[i].light;
                s += neighbors[i].sunlight;
                c += 1;
            }
        });
        l = Math.round(l / c);
        s = Math.round(s / c);
        return {
            ao,
            light: (l << 4) | s,
            combined: ao * (l + s) * 0.5,
        };
    });
    var getLighting = ({ light, sunlight }) => [...Array(4)].map(() => ({
        ao: 1,
        light: (light << 4) | sunlight,
        combined: (light + sunlight) * 0.5,
    }));
    var getOrigin = (
        x,
        y,
        z,
        ox,
        oy,
        oz
    ) => ({
        x: x * 8 + ox,
        y: (y - from.y) * 8 + oy,
        z: z * 8 + oz,
    });
    var geometry = {
        opaque: {
            color: [],
            light: [],
            position: [],
            uv: [],
        },
        transparent: {
            color: [],
            light: [],
            position: [],
            uv: [],
        },
    };
    var pushFace = (
        p1,
        p2,
        p3,
        p4,
        color,
        lighting,
        isTransparent,
        texture,
        facing
    ) => {
        var uvs = [
            [(texture * 2) + 1, (facing * 2)],
            [(texture + 1) * 2, (facing * 2)],
            [(texture + 1) * 2, (facing * 2) + 1],
            [(texture * 2) + 1, (facing * 2) + 1],
        ];
        var vertices = [p1, p2, p3, p4];
        if (
            lighting[0].combined + lighting[2].combined < lighting[1].combined + lighting[3].combined
        ) {
            lighting.unshift(lighting.pop());
            uvs.unshift(uvs.pop());
            vertices.unshift(vertices.pop());
        }
        var mesh = isTransparent ? geometry.transparent : geometry.opaque;
        lighting.forEach((lighting) => {
            mesh.color.push(
                Math.round(color.r * lighting.ao),
                Math.round(color.g * lighting.ao),
                Math.round(color.b * lighting.ao)
            );
            mesh.light.push(lighting.light);
        });
        uvs.forEach((uv) => mesh.uv.push(...uv));
        vertices.forEach((vertex) => mesh.position.push(...vertex));
    };
    for (var x = from.x; x < to.x; x += 1) { // eslint-disable-line prefer-destructuring
        for (var y = from.y; y < to.y; y += 1) { // eslint-disable-line prefer-destructuring
            for (var z = from.z; z < to.z; z += 1) { // eslint-disable-line prefer-destructuring
                var voxel = get(x, y, z);
                if (voxel.type !== types.air) {
                    var neighbors = {
                        get: (nx, ny, nz) => get(x + nx, y + ny, z + nz),
                        top: get(x, y + 1, z),
                        bottom: get(x, y - 1, z),
                        south: get(x, y, z + 1),
                        north: get(x, y, z - 1),
                        west: get(x - 1, y, z),
                        east: get(x + 1, y, z),
                    };
                    var { textures, hasAO, isTransparent } = types[voxel.type];
                    var faces = types[voxel.type].faces({ neighbors, types, voxel });
                    faces.forEach(({
                        facing,
                        offset,
                        size,
                        texture,
                    }) => {
                        switch (facing) {
                            case 'top':
                                {
                                    var o = getOrigin(x, y + 1, z + 1, offset.x, -offset.z, -offset.y);
                                    var lighting;
                                    if (hasAO) {
                                        var n = get(x, y + 1, z - 1);
                                        var e = get(x + 1, y + 1, z);
                                        var w = get(x - 1, y + 1, z);
                                        var s = get(x, y + 1, z + 1);
                                        lighting = getLightingAO(
                                            neighbors.top, [
                                                [w, s, get(x - 1, y + 1, z + 1)],
                                                [e, s, get(x + 1, y + 1, z + 1)],
                                                [e, n, get(x + 1, y + 1, z - 1)],
                                                [w, n, get(x - 1, y + 1, z - 1)],
                                            ]
                                        );
                                    } else {
                                        lighting = getLighting(voxel);
                                    }
                                    pushFace(
                                        [o.x, o.y, o.z], [o.x + size.x, o.y, o.z], [o.x + size.x, o.y, o.z - size.y], [o.x, o.y, o.z - size.y],
                                        voxel.color,
                                        lighting,
                                        isTransparent,
                                        textures[texture],
                                        0
                                    );
                                    break;
                                }
                            case 'bottom':
                                {
                                    var o = getOrigin(x, y, z, offset.x, offset.z, offset.y);
                                    var lighting;
                                    if (hasAO) {
                                        var n = get(x, y - 1, z - 1);
                                        var e = get(x + 1, y - 1, z);
                                        var w = get(x - 1, y - 1, z);
                                        var s = get(x, y - 1, z + 1);
                                        lighting = getLightingAO(
                                            neighbors.bottom, [
                                                [w, n, get(x - 1, y - 1, z - 1)],
                                                [e, n, get(x + 1, y - 1, z - 1)],
                                                [e, s, get(x + 1, y - 1, z + 1)],
                                                [w, s, get(x - 1, y - 1, z + 1)],
                                            ]
                                        );
                                    } else {
                                        lighting = getLighting(voxel);
                                    }
                                    pushFace(
                                        [o.x, o.y, o.z], [o.x + size.x, o.y, o.z], [o.x + size.x, o.y, o.z + size.y], [o.x, o.y, o.z + size.y],
                                        voxel.color,
                                        lighting,
                                        isTransparent,
                                        textures[texture],
                                        1
                                    );
                                    break;
                                }
                            case 'south':
                                {
                                    var o = getOrigin(x, y, z + 1, offset.x, offset.y, -offset.z);
                                    var lighting;
                                    if (hasAO) {
                                        var e = get(x + 1, y, z + 1);
                                        var w = get(x - 1, y, z + 1);
                                        var t = get(x, y + 1, z + 1);
                                        var b = get(x, y - 1, z + 1);
                                        lighting = getLightingAO(
                                            neighbors.south, [
                                                [w, b, get(x - 1, y - 1, z + 1)],
                                                [e, b, get(x + 1, y - 1, z + 1)],
                                                [e, t, get(x + 1, y + 1, z + 1)],
                                                [w, t, get(x - 1, y + 1, z + 1)],
                                            ]
                                        );
                                    } else {
                                        lighting = getLighting(voxel);
                                    }
                                    pushFace(
                                        [o.x, o.y, o.z], [o.x + size.x, o.y, o.z], [o.x + size.x, o.y + size.y, o.z], [o.x, o.y + size.y, o.z],
                                        voxel.color,
                                        lighting,
                                        isTransparent,
                                        textures[texture],
                                        2
                                    );
                                    break;
                                }
                            case 'north':
                                {
                                    var o = getOrigin(x + 1, y, z, -offset.x, offset.y, offset.z);
                                    var lighting;
                                    if (hasAO) {
                                        var e = get(x + 1, y, z - 1);
                                        var w = get(x - 1, y, z - 1);
                                        var t = get(x, y + 1, z - 1);
                                        var b = get(x, y - 1, z - 1);
                                        lighting = getLightingAO(
                                            neighbors.north, [
                                                [e, b, get(x + 1, y - 1, z - 1)],
                                                [w, b, get(x - 1, y - 1, z - 1)],
                                                [w, t, get(x - 1, y + 1, z - 1)],
                                                [e, t, get(x + 1, y + 1, z - 1)],
                                            ]
                                        );
                                    } else {
                                        lighting = getLighting(voxel);
                                    }
                                    pushFace(
                                        [o.x, o.y, o.z], [o.x - size.x, o.y, o.z], [o.x - size.x, o.y + size.y, o.z], [o.x, o.y + size.y, o.z],
                                        voxel.color,
                                        lighting,
                                        isTransparent,
                                        textures[texture],
                                        3
                                    );
                                    break;
                                }
                            case 'west':
                                {
                                    var o = getOrigin(x, y, z, offset.z, offset.y, offset.x);
                                    var lighting;
                                    if (hasAO) {
                                        var n = get(x - 1, y, z - 1);
                                        var s = get(x - 1, y, z + 1);
                                        var t = get(x - 1, y + 1, z);
                                        var b = get(x - 1, y - 1, z);
                                        lighting = getLightingAO(
                                            neighbors.west, [
                                                [n, b, get(x - 1, y - 1, z - 1)],
                                                [s, b, get(x - 1, y - 1, z + 1)],
                                                [s, t, get(x - 1, y + 1, z + 1)],
                                                [n, t, get(x - 1, y + 1, z - 1)],
                                            ]
                                        );
                                    } else {
                                        lighting = getLighting(voxel);
                                    }
                                    pushFace(
                                        [o.x, o.y, o.z], [o.x, o.y, o.z + size.x], [o.x, o.y + size.y, o.z + size.x], [o.x, o.y + size.y, o.z],
                                        voxel.color,
                                        lighting,
                                        isTransparent,
                                        textures[texture],
                                        4
                                    );
                                    break;
                                }
                            case 'east':
                                {
                                    var o = getOrigin(x + 1, y, z + 1, -offset.z, offset.y, -offset.x);
                                    var lighting;
                                    if (hasAO) {
                                        var n = get(x + 1, y, z - 1);
                                        var s = get(x + 1, y, z + 1);
                                        var t = get(x + 1, y + 1, z);
                                        var b = get(x + 1, y - 1, z);
                                        lighting = getLightingAO(
                                            neighbors.east, [
                                                [s, b, get(x + 1, y - 1, z + 1)],
                                                [n, b, get(x + 1, y - 1, z - 1)],
                                                [n, t, get(x + 1, y + 1, z - 1)],
                                                [s, t, get(x + 1, y + 1, z + 1)],
                                            ]
                                        );
                                    } else {
                                        lighting = getLighting(voxel);
                                    }
                                    pushFace(
                                        [o.x, o.y, o.z], [o.x, o.y, o.z - size.x], [o.x, o.y + size.y, o.z - size.x], [o.x, o.y + size.y, o.z],
                                        voxel.color,
                                        lighting,
                                        isTransparent,
                                        textures[texture],
                                        5
                                    );
                                    break;
                                }
                            default:
                                break;
                        }
                    });
                }
            }
        }
    }
    return ['opaque', 'transparent'].reduce((meshes, key) => {
        var {
            color,
            light,
            position,
            uv,
        } = geometry[key];
        meshes[key] = {
            color: new Uint8Array(color),
            light: new Uint8Array(light),
            position: new Uint8Array(position),
            uv: new Uint8Array(uv),
        };
        return meshes;
    }, {});
};