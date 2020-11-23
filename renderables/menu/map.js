// Map UI

var Map = ({
        menu,
        pages,
        width,
        height,
    }) => {
        var image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            image.loaded = true;
            if (menu.page.id === pages.map) {
                menu.draw();
            }
        };
        var state = {
            setChunk({ x, z }) {
                state.chunk = { x, z };
                delete image.loaded;
                if (menu.page.id === pages.map) {
                    loadImage(); // eslint-disable-line no-use-before-define
                }
            },
            setConnectedServer(url) {
                var { servers } = state;
                if (!servers) {
                    return;
                }
                var index = servers.findIndex(({ url: server }) => (server === url));
                if (index === -1) {
                    index = servers.length;
                    servers.push({
                        name: new URL(url).hostname,
                        url,
                    });
                }
                state.connectedServer = index;
                setDisplayedServer(state.connectedServer); // eslint-disable-line no-use-before-define
            },
        };
        var loadImage = () => {
                var {
                    chunk,
                    connectedServer,
                    displayedServer,
                    servers,
                } = state;
                if (!servers) {
                    return;
                }
                var isConnected = connectedServer === displayedServer;
                image.src = `${servers[displayedServer].url}map${isConnected ? `/@${chunk.x},${chunk.z}` : ''}`;
  };
  var connectToServer = () => {
    var {
      displayedServer,
      servers,
    } = state;
    var [/* teleport */, connect] = buttons; // eslint-disable-line no-use-before-define
    connect.isVisible = false;
    state.connectedServer = displayedServer;
    if (menu.page.id === pages.map) {
      menu.draw();
    }
    menu.world.connect(servers[displayedServer].url);
  };
  var setDisplayedServer = (index) => {
    var {
      chunk,
      connectedServer,
      servers,
    } = state;
    /* eslint-disable no-use-before-define */
    var [/* teleport */, connect] = buttons;
    var [name] = labels;
    /* eslint-enable no-use-before-define */
    connect.isVisible = index !== connectedServer;
    name.text = servers[index].name;
    delete image.loaded;
    state.displayedServer = index;
    if (chunk && menu.page.id === pages.map) {
      loadImage();
    }
  };
  var requestTeleport = () => {
    var {
      chunk,
      connectedServer,
      displayedServer,
      servers,
    } = state;
    if (
      !servers
      || connectedServer !== displayedServer
      || !menu.world.server
    ) {
      return;
    }
    var radius = 8;
    var size = 16;
    var length = ((radius * 2) + 1) * size;
    var origin = {
      x: (chunk.x * size) + (size * 0.5) - (length * 0.5),
      z: (chunk.z * size) + (size * 0.5) - (length * 0.5),
    };
    menu.world.server.sendEvent({
      type: 'TELEPORT',
      json: {
        x: Math.floor(origin.x + ((menu.pointer.x / width) * length)),
        z: Math.floor(origin.z + ((menu.pointer.y / height) * length)),
      },
    });
  };
  var buttons = [
    {
      x: 0,
      y: 0,
      width,
      height,
      isVisible: false,
      onPointer: requestTeleport,
    },
    {
      label: 'Connect',
      x: width * 0.35,
      y: height * 0.828,
      width: width * 0.3,
      height: width * 0.05,
      isVisible: false,
      onPointer: connectToServer,
    },
    {
      label: '<',
      x: width * 0.025,
      y: height * 0.9,
      width: width * 0.075,
      height: width * 0.075,
      onPointer: () => {
        var { displayedServer, servers } = state;
        if (servers) {
          setDisplayedServer(
            (displayedServer > 0 ? displayedServer : servers.length) - 1
          );
        }
      },
    },
    {
      label: '>',
      x: width * 0.9,
      y: height * 0.9,
      width: width * 0.075,
      height: width * 0.075,
      onPointer: () => {
        var { displayedServer, servers } = state;
        if (servers) {
          setDisplayedServer(
            (displayedServer + 1) % servers.length
          );
        }
      },
    },
  ];
  var labels = [
    {
      text: '',
      font: '700 30px monospace',
      x: width * 0.5,
      y: height * 0.94,
    },
  ];
  var graphics = [
    ({ ctx }) => {
      var { chunk } = state;
      ctx.fillStyle = '#555';
      ctx.fillRect(0, 0, width, height);
      if (!chunk) {
        return;
      }
      if (image.loaded) {
        ctx.drawImage(image, 0, 0, width, height);
      } else {
        loadImage();
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var radius = 8;
      var size = ((radius * 2) + 1);
      var ratio = width / size;
      ctx.font = `${ratio * 0.3}px monospace`;
      for (var x = 2; x < size; x += 3) {
        ctx.fillText(
          `${(chunk.x - radius) + x}`,
          (x + 0.5) * ratio, ratio * 0.5
        );
      }
      for (var z = 2; z < size; z += 3) {
        ctx.fillText(
          `${(chunk.z - radius) + z}`,
          width - 1 - (ratio * 0.5), (z + 0.5) * ratio
        );
      }
    },
  ];
  fetch(Map.servers)
    .then((res) => res.json())
    .then((servers) => {
      state.servers = servers;
      if (menu.world.server) {
        state.setConnectedServer(menu.world.server.serverURL);
      } else {
        state.connectedServer = 0;
        setDisplayedServer(state.connectedServer);
      }
    });
  return {
    key: 'map',
    page: { buttons, labels, graphics },
    state,
  };
};

Map.servers = 'https://realmsroyal.obeyi.com/auth/servers';

export default Map;