new class {
	constructor() {
		this.tick = false
		this.my_room = (window.location.href.indexOf('#') !== -1) ? atob(window.location.href.split('#').pop()) : atob(window.location.href.split('/').pop())
		import (`./network.js`).then((module) => {
			this.net = new module.default();
			this.net.on('connect', () => {
				this.net.send_cmd('auth', { 'user': '', 'room': this.my_room })
			})
			this.net.on('room.info', () => {
				this.net.send_cmd('got')
			})
			this.net.on('img_frame', (msg) => {
				document.getElementById('out').src = msg.data
				if (this.tick) clearTimeout(this.tick);
				this.tick = setTimeout(() => {
					this.net.send_cmd('got')
					this.tick = false;
				}, 100)

			})
			this.net.connect('wss://ws.emupedia.net')
			window.n = this.net
		})
	}
}