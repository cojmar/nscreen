new class {
	constructor() {
		console.log(btoa(window.location.href.split('/').pop()))
		return;
		this.my_room = "N-screen-room-" + this.uid();
		this.streaming = false
		import (`./network.js`).then((module) => {
			this.net = new module.default();
			this.net.on('connect', () => {
				this.net.send_cmd('auth', { 'user': '', 'room': this.my_room })
			})
			this.net.on('auth.info', () => {
				this.start()
			})
			this.net.connect('wss://ws.emupedia.net')
		})
	}
	start() {

	}
}