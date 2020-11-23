var block = require('./block');

module.exports = {
    ...block,
    name: 'Glass',
    isTransparent: true,
    textures: {
        block: 'glass.js',
    },
};