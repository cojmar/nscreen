new class {
	constructor() {
		this.canvas = document.getElementById('out');
		this.canvas.width = window.innerWidth
		this.canvas.height = window.innerHeight
		this.tick = false
		this.my_room = (window.location.href.indexOf('#') !== -1) ? atob(window.location.href.split('#').pop()) : atob(window.location.href.split('/').pop())
		import (`./network.js`).then((module) => {
			this.net = new module.default();
			this.net.on('connect', () => {
				this.net.send_cmd('auth', { 'user': '', 'room': 'N-screen-lobby' })
			})
			this.net.on('room.data', (data) => {
				if (!data.data.frame) return
				this.frame = LZUTF8.decompress(data.data.frame, { inputEncoding: "StorageBinaryString" });
				this.render(this.frame)
				this.do_ping()
			})
			this.net.on('pong', () => {
				this.net.send_cmd('room_data', 'frame')
			})
			this.net.on('room.info', (data) => {
				if (data.type != 'game') return
				this.frame = LZUTF8.decompress(data.data.frame, { inputEncoding: "StorageBinaryString" });
				this.render(this.frame)
				this.do_ping()
			})
			this.net.on('auth.info', () => {
				this.net.send_cmd('join', this.my_room)

			})
			this.net.connect('wss://ws.emupedia.net')
			window.n = this.net
		})
	}
	do_ping() {
		this.net.send_cmd('ping')
	}
	render(image = false, clean = false) {
		let canvasContext = this.canvas.getContext("2d");
		if (clean) canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if (image) {
			let my_image = new Image();
			my_image.onload = () => {
				canvasContext.drawImage(my_image, 0, 0, this.canvas.width, this.canvas.height);
			};
			my_image.src = image
		}
	}
}