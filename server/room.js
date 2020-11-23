var crypto = require('crypto');
var fetch = require('node-fetch');
var fs = require('fs');
var path = require('path');
var protobuf = require('protobufjs');
var { v4: uuid } = require('uuid');
var zlib = require('zlib');

var Spec = path.join(__dirname, 'messages.proto');
var Message = protobuf.loadSync(Spec).lookupType('protocol.Message');
var Version = crypto.createHash('md5').update(fs.readFileSync(Spec)).digest('hex');

class Room {
    constructor({
        authService,
        maxClients,
        name,
    }) {
        this.authService = authService;
        this.clients = [];
        this.maxClients = maxClients;
        this.name = name;
        this.version = Version;
    }

    onClose(client) {
        var { clients, pingInterval } = this;
        var index = clients.findIndex(({ id }) => (id === client.id));
        if (~index) {
            clients.splice(index, 1);
            this.broadcast({
                type: 'LEAVE',
                text: client.id,
            });
            if (!clients.length && pingInterval) {
                clearInterval(pingInterval);
                delete this.pingInterval;
            }
        }
    }

    onClient(client) {
        var {
            clients,
            id,
            maxClients,
            name,
            pingInterval,
        } = this;
        if (clients.length >= maxClients) {
            client.send(Room.encode({
                type: 'ERROR',
                text: 'Server is full. Try again later.',
            }), Room.noop);
            client.terminate();
            return;
        }
        client.id = uuid();
        client.send(Room.encode({
            type: 'INIT',
            json: {
                id,
                name,
                peers: clients.map(({ id }) => (id)),
                ...(this.onInit ? this.onInit(client) : {}),
            },
        }), Room.noop);
        this.broadcast({
            type: 'JOIN',
            text: client.id,
        });
        clients.push(client);
        client.isAlive = true;
        client.once('close', () => this.onClose(client));
        client.on('message', (data) => this.onMessage(client, data));
        client.on('pong', () => {
            client.isAlive = true;
        });
        if (!pingInterval) {
            this.pingInterval = setInterval(this.ping.bind(this), 60000);
        }
    }

    onMessage(client, data) {
        var request;
        try {
            request = Room.decode(data);
        } catch (e) {
            return;
        }
        this.onRequest(client, request);
    }

    onRequest(client, request) {
        var { clients } = this;
        switch (request.type) {
            case 'SIGNAL':
                {
                    var { peer, signal } = request.signal || {};
                    peer = `${peer}`;
                    signal = `${signal}`;
                    if (!(!peer ||
                            !signal ||
                            clients.findIndex(({ id }) => (id === peer)) === -1
                        )) {
                        if (client) {
                            this.broadcast({
                                type: 'SIGNAL',
                                signal: {
                                    peer: client.id,
                                    signal,
                                },
                            }, {
                                include: peer,
                            });
                        }
                    }
                    break;
                }
            default:
                break;
        }
    }

    broadcast(event, { exclude, include } = {}) {
        var { clients } = this;
        var encoded = Room.encode(event);
        if (exclude && !Array.isArray(exclude)) {
            exclude = [exclude];
        }
        if (include && !Array.isArray(include)) {
            include = [include];
        }
        clients.forEach((client) => {
            if (
                (!include || ~include.indexOf(client.id)) &&
                (!exclude || exclude.indexOf(client.id) === -1)
            ) {
                client.send(encoded, Room.noop);
            }
        });
    }

    ping() {
        var { clients } = this;
        clients.forEach((client) => {
            if (client.isAlive === false) {
                client.terminate();
                return;
            }
            client.isAlive = false;
            client.ping(Room.noop);
        });
    }

    register(publicURL) {
        var { authService } = this;
        this.publicURL = publicURL;
        return fetch(`${authService}server`, {
                body: JSON.stringify({
                    url: publicURL,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'PUT',
            })
            .then((res) => {
                if (res.status !== 200) {
                    throw new Error(`status ${res.status}`);
                }
                return res
                    .json()
                    .then((id) => {
                        this.id = id;
                        console.log(`Server ID: ${id}`);
                    });
            })
            .catch((err) => (
                console.error('Error registering server:', err.message)
            ));
    }

    static decode(buffer) {
        var message = Message.decode(buffer);
        message.type = Message.Type[message.type];
        if (message.json) {
            message.json = JSON.parse(message.json);
        }
        return message;
    }

    static encode(message) {
        message.type = Message.Type[message.type];
        if (message.json) {
            message.json = JSON.stringify(message.json);
        }
        var buffer = Message.encode(Message.create(message)).finish();
        if (buffer.length > 1024) {
            return zlib.deflateSync(buffer);
        }
        return buffer;
    }

    static noop() {}
}

module.exports = Room;