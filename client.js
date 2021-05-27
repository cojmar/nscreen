new class {
	constructor() {
		this.my_room = (window.location.href.indexOf('#') !== -1) ? atob(window.location.href.split('#').pop()) : atob(window.location.href.split('/').pop())
		import (`./network.js`).then((module) => {
			this.net = new module.default();
			this.net.on('connect', () => {
				this.net.send_cmd('auth', { 'user': '', 'room': this.my_room })
			})
			this.net.on('auth.info', () => {

			})
			this.net.on('img_frame', (msg) => {
				document.getElementById('out').src = msg.data
			})
			this.net.connect('wss://ws.emupedia.net')
		})
	}
}