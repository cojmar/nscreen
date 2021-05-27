new class {
	constructor() {
		this.my_room = atob(window.location.href.split('/').pop())
		import (`./network.js`).then((module) => {
			this.net = new module.default();
			this.net.on('connect', () => {
				this.net.send_cmd('auth', { 'user': '', 'room': this.my_room })
			})
			this.net.on('auth.info', () => {
				this.start()
			})
			this.net.on('img_frame', (img) => {
				document.getElementById('out').src = img
			})
			this.net.connect('wss://ws.emupedia.net')
		})
	}
}