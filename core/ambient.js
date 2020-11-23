import {
    Audio,
    AudioLoader,
    Math as ThreeMath,
} from './three.js';

class Ambient {
    constructor({
        listener
    }) {
        var {
            format,
            sounds
        } = Ambient;
        this.effects = {};
        this.listener = listener;
        var loader = new AudioLoader();
        Promise.all(sounds.map(({
                name
            }) => new Promise((resolve, reject) => (
                loader.load(`/sounds/${name}.${format}`, resolve, null, reject)
            ))))
            .then(this.onLoad.bind(this));
    }

    onLoad(buffers) {
        var {
            gain,
            sounds
        } = Ambient;
        var {
            effects,
            listener
        } = this;
        this.sounds = sounds.map((sound, i) => {
            var audio = new Audio(listener);
            audio.setBuffer(buffers[i]);
            if (sound.trigger) {
                audio.setVolume(gain);
            } else {
                audio.setLoop(true);
                audio.setVolume(sound.effect && effects[sound.effect] ? (gain * 0.5) : 0);
                audio.play();
            }
            return {
                ...sound,
                audio,
            };
        });
    }

    trigger(name) {
        var {
            sounds
        } = this;
        if (!sounds) {
            return;
        }
        var sound = sounds.find(({
            trigger
        }) => (trigger === name));
        if (sound) {
            sound.audio.play();
        }
    }

    updateAltitude(altitude) {
        var {
            gain
        } = Ambient;
        var {
            sounds
        } = this;
        if (!sounds) {
            return;
        }
        sounds.forEach(({
            audio,
            from,
            to
        }) => {
            if (from || to) {
                var step = ThreeMath.clamp(ThreeMath.mapLinear(altitude, from, to, 0, 2), 0, 2);
                audio.setVolume((step >= 1 ? 2 - step : step) * gain);
            }
        });
    }

    updateEffect({
        name,
        enabled
    }) {
        var {
            gain
        } = Ambient;
        var {
            effects,
            sounds
        } = this;
        effects[name] = enabled;
        if (!sounds) {
            return;
        }
        var effect = sounds.find(({
            effect
        }) => (effect === name));
        if (effect) {
            effect.audio.setVolume(enabled ? (gain * 0.5) : 0);
        }
    }
}

Ambient.format = document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"') !== '' ? 'ogg' : 'mp3';
Ambient.gain = 0.5;
Ambient.sounds = [{
        name: 'beach',
        from: 0,
        to: 12,
    },
    {
        name: 'forest',
        from: 4,
        to: 24,
    },
    {
        name: 'peak',
        from: 16,
        to: 40,
    },
    {
        name: 'rain',
        effect: 'rain',
    },
    {
        name: 'shutter',
        trigger: 'shutter',
    },
];

export default Ambient;