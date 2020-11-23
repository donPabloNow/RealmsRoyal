import {
    BufferGeometry,
    Mesh,
    MeshBasicMaterial,
    BufferAttribute,
    Object3D,
    RepeatWrapping,
    ShaderLib,
    ShaderMaterial,
    sRGBEncoding,
    CanvasTexture,
    UniformsUtils,
    UVMapping,
} from '../core/three.js';

// Voxels chunk

class Voxels extends Object3D {
    static setupMaterials() {
        var opaque = new ShaderMaterial({
            name: 'voxels-material',
            vertexColors: true,
            fog: true,
            fragmentShader: ShaderLib.basic.fragmentShader
                .replace(
                    '#include <common>', [
                        'varying float vlight;',
                        'varying float vsunlight;',
                        'uniform float sunlightIntensity;',
                        '#include <common>',
                    ].join('\n')
                )
                .replace(
                    '#include <envmap_fragment>', [
                        '#include <envmap_fragment>',
                        'outgoingLight *= (vlight + max(vsunlight * sunlightIntensity, 0.05)) * 0.5;',
                    ].join('\n')
                ),
            vertexShader: ShaderLib.basic.vertexShader
                .replace(
                    '#include <common>', [
                        'attribute float light;',
                        'varying float vlight;',
                        'varying float vsunlight;',
                        '#include <common>',
                    ].join('\n')
                )
                .replace(
                    '#include <color_vertex>', [
                        '#ifdef USE_COLOR',
                        '  vColor.xyz = color.xyz / 255.0;',
                        '#endif',
                        'vlight = float((int(light) >> 4) & 15) / 15.0;',
                        'vsunlight = float(int(light) & 15) / 15.0;',
                    ].join('\n')
                ),
            uniforms: {
                ...UniformsUtils.clone(ShaderLib.basic.uniforms),
                sunlightIntensity: { value: 1 },
            },
        });
        var transparent = opaque.clone();
        transparent.transparent = true;
        var ui = new MeshBasicMaterial({
            transparent: true,
        });
        var atlas = new CanvasTexture(
            document.createElement('canvas'),
            UVMapping,
            RepeatWrapping,
            RepeatWrapping
        );
        // atlas.image.style.position = 'absolute';
        // atlas.image.style.left = '0px';
        // atlas.image.style.top = '0px';
        // document.body.appendChild(atlas.image);
        atlas.anisotropy = 16;
        atlas.image.height = 128;
        atlas.encoding = sRGBEncoding;
        atlas.loader = new Image();
        atlas.loader.crossOrigin = 'anonymous';
        atlas.loader.onload = () => {
            var size = atlas.loader.height;
            var count = atlas.loader.width / size;
            var scaled = atlas.image.height;
            var halfScaled = atlas.image.height * 0.5;
            atlas.image.width = (count + 0.5) * 2 * scaled;
            var ctx = atlas.image.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            for (var i = 0; i < count; i += 1) {
                ctx.drawImage(
                    atlas.loader,
                    i * size,
                    0,
                    1,
                    size,
                    ((i * 2) + 0.5) * scaled,
                    0,
                    halfScaled,
                    scaled
                );
                ctx.drawImage(
                    atlas.loader,
                    i * size,
                    0,
                    size,
                    size,
                    ((i * 2) + 1) * scaled,
                    0,
                    scaled,
                    scaled
                );
                ctx.drawImage(
                    atlas.loader,
                    i * size + size - 1,
                    0,
                    1,
                    size,
                    ((i * 2) + 2) * scaled,
                    0,
                    halfScaled,
                    scaled
                );
            }
            atlas.needsUpdate = true;
            atlas.repeat.x = 1 / ((count + 0.5) * 2);
            atlas.updateMatrix();
            [opaque, transparent, ui].forEach((material) => {
                material.map = atlas;
                if (material.uniforms) {
                    material.uniforms.map.value = atlas;
                    material.uniforms.uvTransform.value.copy(atlas.matrix);
                }
                material.needsUpdate = true;
            });
        };
        Voxels.materials = {
            atlas,
            opaque,
            transparent,
            ui,
        };
    }

    static updateMaterials({ atlas, intensity }) {
        if (!Voxels.materials) {
            Voxels.setupMaterials();
        }
        var {
            atlas: { loader },
            opaque,
            transparent,
        } = Voxels.materials;
        if (atlas !== undefined) {
            if (atlas) {
                loader.src = atlas;
            } else {
                [opaque, transparent].forEach((material) => {
                    material.map = null;
                    material.uniforms.map.value = null;
                });
            }
        }
        if (intensity !== undefined) {
            [opaque, transparent].forEach((material) => {
                material.uniforms.sunlightIntensity.value = intensity;
            });
        }
    }

    constructor() {
        if (!Voxels.materials) {
            Voxels.setupMaterials();
        }
        super();
        this.matrixAutoUpdate = false;
        this.meshes = {
            opaque: new Mesh(new BufferGeometry(), Voxels.materials.opaque),
            transparent: new Mesh(new BufferGeometry(), Voxels.materials.transparent),
        };
        ['opaque', 'transparent'].forEach((key) => {
            this.meshes[key].matrixAutoUpdate = false;
            this.add(this.meshes[key]);
        });
    }

    dispose() {
        var { geometry } = this;
        geometry.dispose();
    }

    update({
        chunk,
        heightmap,
        geometries,
    }) {
        var { updateHeightmap } = Voxels;
        var { meshes } = this;

        this.chunk = chunk;
        this.position
            .set(chunk.x, chunk.y, chunk.z)
            .multiplyScalar(8);
        this.scale.setScalar(1 / 16);
        this.updateMatrix();

        ['opaque', 'transparent'].forEach((key) => {
            var {
                color,
                light,
                position,
                uv,
            } = geometries[key];
            var mesh = meshes[key];

            if (!position.length) {
                mesh.visible = false;
                return;
            }

            var { geometry } = mesh;

            geometry.setAttribute('color', new BufferAttribute(color, 3));
            geometry.setAttribute('light', new BufferAttribute(light, 1));
            geometry.setAttribute('position', new BufferAttribute(position, 3));
            geometry.setAttribute('uv', new BufferAttribute(uv, 2)); {
                var len = (position.length / 3 / 4) * 6;
                var index = new Uint16Array(len);
                for (var i = 0, v = 0; i < len; i += 6, v += 4) {
                    index[i] = v;
                    index[i + 1] = v + 1;
                    index[i + 2] = v + 2;
                    index[i + 3] = v + 2;
                    index[i + 4] = v + 3;
                    index[i + 5] = v;
                }
                geometry.setIndex(new BufferAttribute(index, 1));
            }
            geometry.computeBoundingSphere();
            updateHeightmap({ chunk, geometry, heightmap });

            mesh.visible = true;
        });

        super.updateMatrixWorld();
    }

    // eslint-disable-next-line class-methods-use-this
    updateMatrixWorld() {}

    static updateHeightmap({
        chunk,
        geometry,
        heightmap,
    }) {
        var aux = { x: 0, y: 0, z: 0 };
        var position = geometry.getAttribute('position');
        var uv = geometry.getAttribute('uv');
        var { count } = uv;
        var offsetY = chunk.y * 16;
        for (var i = 0; i < count; i += 4) {
            if (uv.getY(i) === 0) {
                aux.x = 0xFF;
                aux.y = 0;
                aux.z = 0xFF;
                for (var j = 0; j < 4; j += 1) {
                    aux.x = Math.min(aux.x, Math.floor(position.getX(i + j) / 8));
                    aux.y = Math.max(aux.y, offsetY + Math.ceil(position.getY(i + j) / 8));
                    aux.z = Math.min(aux.z, Math.floor(position.getZ(i + j) / 8));
                }
                var index = (aux.x * 16) + aux.z;
                heightmap[index] = Math.max(heightmap[index], aux.y);
            }
        }
    }
}

export default Voxels;