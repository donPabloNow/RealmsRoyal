import Head from '../renderables/head.js';

class Session {
    constructor({
        dialogs,
        state,
    }) {
        this.dialogs = dialogs;
        this.state = state;
        Object.keys(dialogs).forEach((dialog) => {
            dialog = dialogs[dialog];
            dialog.addEventListener('click', ({ target }) => {
                if (target === dialog) {
                    dialog.className = 'dialog';
                }
            });
        }); {
            var [form] = dialogs.login.getElementsByTagName('form');
            var [alternative] = dialogs.login.getElementsByTagName('a');
            form.addEventListener('submit', this.onLoginSubmit.bind(this));
            alternative.addEventListener('click', () => this.showDialog('register'));
        } {
            var [form] = dialogs.register.getElementsByTagName('form');
            var [alternative] = dialogs.register.getElementsByTagName('a');
            form.addEventListener('submit', this.onRegisterSubmit.bind(this));
            alternative.addEventListener('click', () => this.showDialog('login'));
        } {
            var skin = localStorage.getItem('blocks::skin');
            if (skin) {
                this.skin = skin;
                this.renderSkin();
            } else {
                this.updateSkin();
            }
        } {
            var session = localStorage.getItem('blocks::session');
            if (session) {
                this.session = JSON.parse(session);
                this.refreshSession();
            }
            this.renderState();
        }
        state.style.display = '';
    }

    static getLocation(id) {
        var { authService, formatDate } = Session;
        return fetch(`${authService}location/${id}/meta`)
            .then((res) => {
                if (res.status !== 200) {
                    throw new Error();
                }
                return res
                    .json()
                    .then((location) => ({
                        ...location,
                        createdAt: formatDate(location.createdAt),
                        photo: `${authService}location/${location._id}/photo`,
                    }));
            });
    }

    getLocations() {
        var { authService, getLocation } = Session;
        var { session } = this;
        return fetch(`${authService}user/locations`, {
                headers: { Authorization: `Bearer ${session.token}` },
            })
            .then((res) => res.json())
            .then((locations) => locations.map((location) => ({
                ...location,
                getMeta: () => getLocation(location._id),
            })));
    }

    onLoginSubmit(e) {
        var { target: form } = e;
        var { authService } = Session;
        var { dialogs: { login: dialog } } = this;
        var { email, password, submit } = form;
        var [error] = dialog.getElementsByClassName('error');
        e.preventDefault();
        error.style.display = '';
        submit.disabled = true;
        fetch(`${authService}user`, {
                body: JSON.stringify({
                    email: email.value,
                    password: password.value,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'PUT',
            })
            .then((res) => {
                submit.disabled = false;
                if (res.status !== 200) {
                    throw new Error();
                }
                form.reset();
                dialog.className = 'dialog';
                return res
                    .json()
                    .then((session) => this.updateSession(session));
            })
            .catch(() => {
                error.style.display = 'block';
                error.innerText = 'Invalid email/password combination';
            });
    }

    onRegisterSubmit(e) {
        var { target: form } = e;
        var { authService } = Session;
        var { dialogs: { register: dialog }, skin } = this;
        var {
            name,
            email,
            password,
            confirmPassword,
            submit,
        } = form;
        var [error] = dialog.getElementsByClassName('error');
        e.preventDefault();
        if (password.value !== confirmPassword.value) {
            error.style.display = 'block';
            error.innerText = 'Passwords don\'t match!';
            return;
        }
        error.style.display = '';
        submit.disabled = true;
        fetch(`${authService}users`, {
                body: JSON.stringify({
                    name: name.value,
                    email: email.value,
                    password: password.value,
                    skin: skin.substr(skin.indexOf(',') + 1),
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            })
            .then((res) => {
                submit.disabled = false;
                if (res.status !== 200) {
                    throw new Error();
                }
                form.reset();
                dialog.className = 'dialog';
                return res
                    .json()
                    .then((session) => this.updateSession(session));
            })
            .catch(() => {
                error.style.display = 'block';
                error.innerText = 'That email has already registered';
            });
    }

    renderSkin() {
        var {
            skin,
            state,
        } = this;
        var [ /* name */ , user] = state.getElementsByTagName('div');
        var [image] = user.getElementsByTagName('canvas');
        image.width = 64;
        image.height = 64;
        var ctx = image.getContext('2d');
        var texture = new Image();
        texture.onload = () => {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, image.width, image.height);
            ctx.drawImage(texture, 8, 8, 8, 8, 0, 0, image.width, image.height);
            ctx.drawImage(texture, 40, 8, 8, 8, 0, 0, image.width, image.height);
        };
        texture.src = skin;
    }

    renderState() {
        var {
            session,
            state,
        } = this;
        var [name] = state.getElementsByTagName('div');
        var [button] = state.getElementsByTagName('button');
        if (session) {
            name.innerText = session.name;
            button.innerText = 'Logout';
            button.className = '';
            button.onclick = () => this.updateSession();
        } else {
            name.innerText = 'Guest';
            button.innerText = 'Login';
            button.className = 'primary';
            button.onclick = () => this.showDialog('login');
        }
    }

    refreshSession() {
        var { authService } = Session;
        var { session: { token } } = this;
        fetch(`${authService}user`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((res) => {
                if (res.status !== 200) {
                    this.updateSession();
                    return;
                }
                res
                    .json()
                    .then((session) => this.updateSession(session));
            });
    }

    refreshSkin() {
        var { authService } = Session;
        var { session: { token } } = this;
        fetch(`${authService}user/skin`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((res) => res.blob())
            .then((blob) => {
                var reader = new FileReader();
                reader.onload = () => {
                    var { result: skin } = reader;
                    if (this.skin !== skin) {
                        this.updateSkin(skin);
                    }
                };
                reader.readAsDataURL(blob);
            });
    }

    showDialog(id) {
        var { dialogs } = this;
        Object.keys(dialogs).forEach((key) => {
            dialogs[key].className = 'dialog';
        });
        dialogs[id].className = 'dialog open';
    }

    showLocation(id) {
        var { getLocation } = Session;
        var { dialogs: { location: dialog } } = this;
        return getLocation(id)
            .then((location) => {
                var [container] = dialog.getElementsByTagName('div');
                var [image] = container.getElementsByTagName('img');
                var [info] = container.getElementsByTagName('div');
                var [title, user] = info.getElementsByTagName('div');
                image.src = location.photo;
                title.innerText = (
                    `x:${location.position.x} y:${location.position.y} z:${location.position.z}` +
                    ` - ${location.server.name}`
                );
                user.innerText = (
                    `${location.user.name}` +
                    ` - ${location.createdAt.date}` +
                    ` ${location.createdAt.time}`
                );
                this.showDialog('location');
                return location;
            });
    }

    updateSession(session) {
        this.session = session;
        if (session) {
            localStorage.setItem('blocks::session', JSON.stringify(session));
            this.refreshSkin();
        } else {
            localStorage.removeItem('blocks::session');
            this.updateSkin();
        }
        this.renderState();
    }

    updateSkin(skin) {
        this.skin = skin || Head.generateTexture().toDataURL();
        localStorage.setItem('blocks::skin', this.skin);
        this.renderSkin();
    }

    uploadSkin() {
        var { authService } = Session;
        var { session, skin } = this;
        if (!session) {
            return;
        }
        fetch(`${authService}user`, {
            body: JSON.stringify({
                skin: skin.substr(skin.indexOf(',') + 1),
            }),
            headers: {
                Authorization: `Bearer ${session.token}`,
                'Content-Type': 'application/json',
            },
            method: 'PATCH',
        });
    }

    uploadLocation({
        blob,
        position,
        rotation,
    }) {
        var { authService } = Session;
        var { session, server } = this;
        if (!session || !server) {
            return Promise.reject();
        }
        var body = new FormData();
        body.append('photo', blob);
        body.append('positionX', position.x);
        body.append('positionY', position.y);
        body.append('positionZ', position.z);
        body.append('rotation', rotation);
        body.append('server', server);
        return fetch(`${authService}locations`, {
            body,
            headers: {
                Authorization: `Bearer ${session.token}`,
            },
            method: 'POST',
        });
    }

    static formatDate(date) {
            var leadingZero = (v) => (v.length < 2 ? `0${v}` : v);
            date = new Date(date);
            return {
                date: `${date.getFullYear()}/${leadingZero(`${date.getMonth() + 1}`)}/${leadingZero(`${date.getDate()}`)}`,
      time: `${leadingZero(`${date.getHours()}`)}:${leadingZero(`${date.getMinutes()}`)}`,
    };
  }
}

Session.authService = 'https://realmsroyal.obeyi.com/auth/';

export default Session;