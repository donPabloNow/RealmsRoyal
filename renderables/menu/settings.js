// Settings UI

var Settings = ({
    menu,
    pages,
    width,
    height,
}) => {
    var state = {
        renderRadius: (
            parseInt(localStorage.getItem('blocks::renderRadius') || 0, 10) || 8
        ),
        setRenderRadius(radius) {
            var [
                /* teleport */
                ,
                /* fly */
                , // eslint-disable-line comma-style
                low,
                mid,
                high,
            ] = buttons; // eslint-disable-line no-use-before-define
            delete low.background;
            delete mid.background;
            delete high.background;
            var options = { 8: low, 12: mid, 16: high };
            options[radius].background = '#393';
            if (menu.page.id === pages.settings) {
                menu.draw();
            }
        },
    };
    var setLocomotion = (type) => {
        var [teleport, fly] = buttons; // eslint-disable-line no-use-before-define
        delete fly.background;
        delete teleport.background;
        var options = { fly, teleport };
        options[type].background = '#393';
        var locomotions = { fly: 0, teleport: 1 };
        menu.world.locomotion = locomotions[type];
        if (menu.page.id === pages.settings) {
            menu.draw();
        }
    };
    var buttons = [{
            background: '#393',
            label: 'Teleport',
            x: width * 0.0625,
            y: height * 0.25625,
            width: width * 0.40625,
            height: height * 0.1875,
            onPointer: () => setLocomotion('teleport'),
        },
        {
            label: 'Fly',
            x: width * 0.53125,
            y: height * 0.25625,
            width: width * 0.40625,
            height: height * 0.1875,
            onPointer: () => setLocomotion('fly'),
        },
        {
            label: 'Low',
            x: width * 0.0625,
            y: height * 0.75625,
            width: width * 0.25,
            height: height * 0.1875,
            onPointer: () => menu.world.updateRenderRadius(8),
        },
        {
            label: 'Mid',
            x: width * 0.375,
            y: height * 0.75625,
            width: width * 0.25,
            height: height * 0.1875,
            onPointer: () => menu.world.updateRenderRadius(12),
        },
        {
            label: 'High',
            x: width * 0.6875,
            y: height * 0.75625,
            width: width * 0.25,
            height: height * 0.1875,
            onPointer: () => menu.world.updateRenderRadius(16),
        },
    ];
    var labels = [{
            text: 'Locomotion',
            x: width * 0.5,
            y: height * 0.15,
        },
        {
            text: 'Render distance',
            x: width * 0.5,
            y: height * 0.65,
        },
    ];
    return {
        key: 'settings',
        page: { buttons, labels },
        state,
    };
};

export default Settings;