[RealmsRoyal](https://realmsroyal.obeyi.com/)
[![Build Status](https://travis-ci.org/donPablonow/realmsroyal.svg?branch=master)](https://travis-ci.org/donPablonow/RealmsRoyal)
==

[![screenshot](https://realmsroyal.obeyi.com/screenshot.jpg)](https://realmsroyal.obeyi.com/)

#### Create your own server in two steps:

- [Remix glitch.com/~realmsroyal-server](https://glitch.com/edit/#!/remix/realmsroyal-server)
- Set this variables on the `.env` file:
  - `NAME` the server name (for the public registry)
  - `SEED` 16bit world generation seed. (0 - 65535)

#### If you want to experiment with world generation:

- [Remix glitch.com/~realmsroyal-server-worldgen](https://glitch.com/edit/#!/remix/realmsroyal-server-worldgen)
- Set the variables on the `.env` file
- Edit [worldgen.js](https://glitch.com/edit/#!/realmsroyal-server-worldgen?path=worldgen.js)

#### You can also use docker-compose if you already own a more powerful server:

```yaml
version: "3"
services:
  server:
    image: donPablonow/realmsroyal:latest
    environment:
      - NAME=Your Server Name
      - PRELOAD=10
      - PUBLIC_URL=https://yourserver.url/
      - SEED=1234
      - STORAGE=/data
    ports:
      - "80:8080"
    volumes:
      - "data:/data"
volumes:
  data:
```

#### Server configuration

- `CLIENT` serve the client (boolean, defaults to false)
- `DESTINATIONS` serve the destinations web ui (boolean, defaults to false)
- `GENERATOR` the world [generator](server/generators.js) function
- `MAX_CLIENTS` the maximum concurrent players (defaults to 16)
- `NAME` the server name (for the public registry)
- `PRELOAD` a chunk radius around the spawn area to be preloaded
- `PUBLIC_URL` public url of the server (for the public registry)
- `SEED` 16bit world generation seed. (0 - 65535)
- `STORAGE` directory in where to store the generated/modified chunks

```bash
# random seed, no preload, 16 clients
node server/main.js
# same, but preloading a 10 chunk radius around the spawn area
PRELOAD=10 node server/main.js
# flat world for only 4 clients with persistence
GENERATOR=flat MAX_CLIENTS=4 PRELOAD=10 SEED=1234 STORAGE=./data node server/main.js
# heightmap driven world generator
GENERATOR=heightmap COLORMAP=./island_rgb.png HEIGHTMAP=./island_height.png node server/main.js
```

#### Local development

webxr requires an https origin. to test with headsets on your local network:

```bash
# generate a self-signed cert/key:
openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 -keyout server.key -out server.crt
# start the server with TLS
TLS_CERT=server.crt TLS_KEY=server.key npm start
```
