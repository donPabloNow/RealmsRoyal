import SimplePeer from './simplepeer.js';
import { Object3D } from './three.js';
import Peer from '../renderables/peer.js';

class Peers extends Object3D {
    constructor({ listener }) {
        super();
        this.listener = listener;
        this.peers = [];
        if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(this.onUserMedia.bind(this))
                .catch(() => {});
        }
    }

    onAnimationTick({ delta, player }) {
        var { peers } = this;
        peers.forEach(({ controllers }) => controllers.forEach((controller) => {
            if (controller.visible) {
                controller.hand.animate({ delta });
            }
        }));
        this.broadcast(player);
    }

    onUserMedia(stream) {
        var { peers } = this;
        this.userMedia = stream;
        peers.forEach(({ connection }) => {
            if (!connection.destroyed) {
                connection.addStream(stream);
            }
        });
    }

    broadcast({ controllers, head, session: { skin } }) {
        var { peers } = this;
        var hands = controllers
            .filter(({ hand }) => (!!hand))
            .sort(({ hand: { handedness: a } }, { hand: { handedness: b } }) => b.localeCompare(a));
        var update = new Float32Array([
            ...head.position.toArray(),
            ...head.quaternion.toArray(),
            ...(hands.length === 2 ? (
                hands.reduce((hands, { hand: { state }, worldspace: { position, quaternion } }) => {
                    hands.push(
                        ...position.toArray(),
                        ...quaternion.toArray(),
                        state
                    );
                    return hands;
                }, [])
            ) : []),
        ]);
        var payload = new Uint8Array(1 + update.byteLength);
        payload[0] = 0x01;
        payload.set(new Uint8Array(update.buffer), 1);
        peers.forEach(({ connection }) => {
            if (
                connection &&
                connection._channel &&
                connection._channel.readyState === 'open'
            ) {
                try {
                    connection.send(payload);
                } catch (e) {
                    return;
                }
                if (!connection.hasSentSkin) {
                    connection.hasSentSkin = true;
                    var encoded = (new TextEncoder()).encode(skin);
                    var payload = new Uint8Array(1 + encoded.length);
                    payload.set(encoded, 1);
                    try {
                        connection.send(payload);
                    } catch (e) {
                        // console.log(e);
                    }
                }
            }
        });
    }

    connect({ id, initiator = false }) {
        var {
            listener,
            server,
            userMedia,
        } = this;
        var connection = new SimplePeer({
            initiator,
            stream: userMedia,
        });
        var peer = new Peer({ peer: id, connection, listener });
        connection.on('error', () => {});
        connection.on('data', peer.onData.bind(peer));
        connection.on('signal', (signal) => (
            server.sendEvent({
                type: 'SIGNAL',
                signal: {
                    peer: id,
                    signal: JSON.stringify(signal),
                },
            })
        ));
        connection.on('track', peer.onTrack.bind(peer));
        this.add(peer);
        return peer;
    }

    init({
        server,
        peers,
    }) {
        this.server = server;
        this.peers = peers.map((id) => this.connect({ id, initiator: true }));
    }

    join(peer) {
        var { peers } = this;
        peers.push(this.connect({ id: peer }));
    }

    leave(peer) {
        var { peers } = this;
        var index = peers.findIndex(({ peer: id }) => (id === peer));
        if (~index) {
            var [peer] = peers.splice(index, 1);
            this.remove(peer);
            peer.dispose();
        }
    }

    signal({ peer, signal }) {
        var { peers } = this;
        var { connection } = peers[
            peers.findIndex(({ peer: id }) => (id === peer))
        ] || {};
        if (connection && !connection.destroyed) {
            try {
                signal = JSON.parse(signal);
            } catch (e) {
                return;
            }
            connection.signal(signal);
        }
    }

    reset() {
        var { peers } = this;
        peers.forEach((peer) => {
            this.remove(peer);
            peer.dispose();
        });
        this.peers = [];
        delete this.server;
    }
}

export default Peers;