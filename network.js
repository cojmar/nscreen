export default class {
    constructor() {
        this.use_shared_objects = true; //if true generates/updates room and me shared_objects from server
        this.use_workers = false; //To do
        this.socket = {
            on: () => { this.on(arguments) },
            send: (data) => { if (this.ws) this.ws.send(data) },
            send_cmd: () => { this.send_cmd(arguments) },
            close: () => { if (this.ws) this.ws.close() }
        }
        this.events = {};
        this.server = `ws://${this.getBaseUrl()}:3000`;
        this.connected = false;
        this.last_on_set = Math.floor(Date.now() / 1000);
        this.keep_alive();
    }
    do_merge(data1, data2) {
        var ret = false;
        if (typeof data1 !== 'object' || typeof data2 !== 'object') {
            data1 = data2;
            return true;
        }
        for (var n in data2) {
            if (!data1[n]) {
                data1[n] = data2[n];
                if (!ret) ret = true;
            } else {
                if (typeof data1[n] === 'object' && typeof data2[n] === 'object') {
                    var ret2 = this.do_merge(data1[n], data2[n]);
                    if (!ret) ret = ret2;
                } else {
                    data1[n] = data2[n];
                    if (!ret) ret = true;
                }
            }
        }
        return ret;
    }
    keep_alive() {
        if (this.keep_alive_interval) clearInterval(this.keep_alive_interval);
        this.keep_alive_interval = setInterval(() => {
            this.send('ping');
        }, 30000);
        return this;
    }
    getBaseUrl() {
        return window.location.href.split('://')[1].split('/')[0];
    }
    map_room(ev, data) {
        if (!this.use_shared_objects) return true;
        switch (ev) {
            case 'room.info':
                this.room = data
                if (this.me) {
                    this.room.i_am_host = (this.room.host === this.room.me) ? true : false;
                    this.me.data = this.room.users[this.room.me].data;
                }
                break
            case 'room.host':
                if (this.room) {
                    this.room.host = data;
                    this.room.i_am_host = (this.room.host === this.room.me) ? true : false;
                }
                break
            case 'my_info':
            case 'auth.info':
                this.me = data;
                break
            case 'room.user_join':
                if (data.user && this.room && data.room && this.room.room === data.room) {
                    if (data.user === this.room.me) return false;
                    this.room.users[data.user] = data.data;
                }
                break
            case 'room.user_leave':
                if (data.user && this.room && data.room && this.room.room === data.room) {
                    if (this.room.users[data.user]) delete this.room.users[data.user];
                }
                break
            case 'room.user_data':
                if (data.user && this.room && this.room.users[data.user]) {
                    this.do_merge(this.room.users[data.user].data, data.data);
                }
                break
            case 'room.data':
                if (this.room && this.room.name === data.room) {
                    this.do_merge(this.room.data, data.data);
                }
                break
        }
        return true;
    }
    strip_html(str) {
        return str.replace(/(<([^>]+)>)/gi, "").replace('<', '&lt;').replace('>', '&gt;')
    }
    emit_event(ev, data) {
        if (!ev) return false;
        if (ev === 'room.msg' && data.msg) data.msg = this.strip_html(data.msg)
        if (!this.map_room(ev, data)) return false;
        if (typeof this.events[ev] === 'object') this.events[ev].forEach(cb => {
            cb(data);
        });
        if (typeof this.events['cmd'] === 'object') this.events['cmd'].forEach(cb => {
            cb({ cmd: ev, data: data });
        });
    }
    connect() {
        let server = arguments[0] || false;
        if (server) this.server = server;
        if (this.socket.close) this.socket.close(4666);
        if (this.connect_timeout) clearTimeout(this.connect_timeout);
        let last_on = Math.floor(Date.now() / 1000) - this.last_on_set;
        if (last_on < 2) {
            this.connect_timeout = setTimeout(() => {
                this.connect();
            });
            return this;
        }
        this.connect_socket();
        return this;
    }
    disconnect() {
        if (this.connected) this.socket.close(4666);
        return this;
    }
    on(cmd, call_back) {
        this.last_on_set = Math.floor(Date.now() / 1000);
        if (!cmd) return this;
        if (typeof call_back !== 'function') return this;
        if (!this.events[cmd]) {
            this.events[cmd] = [];
        }
        this.events[cmd].push(call_back);
        return this;
    }
    connect_socket(no_ws = false) {
        this.ws = new WebSocket(this.server);
        this.ws.onopen = () => {
            this.connected = true;
            this.emit_event('connect', { server: this.server });
        };
        this.ws.onclose = (close_event) => {
            this.connected = false;
            if (close_event.code !== 4666) {
                if (this.connect_timeout) clearTimeout(this.connect_timeout);
                this.connect_timeout = setTimeout(() => {
                    this.connect();
                }, 10000);
            }
            this.emit_event('disconnect', close_event);
        };
        this.ws.onmessage = (message) => {
            let data;
            try {
                data = JSON.parse(message.data);
            } catch (error) {
                data = message.data
            }
            this.emit_event(data.cmd, data.data)
        };
        return this;
    }
    send(data) {
        if (data.cmd === 'connect') return this.connect(data.data);
        if (data.cmd === 'disconnect') return this.disconnect();
        if (!this.connected) return this;
        this.socket.send(JSON.stringify(data));
        return this;
    }
    send_cmd(cmd, data) {
        return this.send({
            cmd: cmd,
            data: data
        });
    }
}