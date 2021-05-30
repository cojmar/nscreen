new class {
	constructor() {
		this.canvas = document.getElementById('out');
		this.canvas.width = window.innerWidth
		this.canvas.height = window.innerHeight
		this.getting_data = false
		this.my_room = (window.location.href.indexOf('#') !== -1) ? atob(window.location.href.split('#').pop()) : atob(window.location.href.split('/').pop())
		import (`./network.js`).then((module) => {
			this.net = new module.default();
			this.net.on('connect', () => {
				this.net.send_cmd('auth', { 'user': '', 'room': 'N-screen-lobby' })
			})
			this.net.on('frame', (data) => {
				this.getting_data = false
				var blob = new Blob([pako.inflate(data.data.buffer), 'image/png']);
				this.render(blob)
			})
			this.net.on('room.data', (data) => {
				this.getting_data = false
				if (!data.data.frame) return
				this.frame = data.data.frame;
				//this.render(this.frame)

			})
			this.net.on('room.info', (data) => {
				if (data.type != 'game') return
				this.getting_data = false
				this.frame = data.data.frame;
				//this.render(this.frame)
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
		if (this.getting_data) return
		this.getting_data = true
		this.net.send_cmd('get_img')

	}
	render(image = false, clean = false) {
		let canvasContext = this.canvas.getContext("2d");
		if (clean) canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if (image) {
			let my_image = new Image();
			my_image.onload = () => {
				canvasContext.drawImage(my_image, 0, 0, this.canvas.width, this.canvas.height);
			};
			my_image.src = URL.createObjectURL(image)
		}
		this.getting_data = false
		this.do_ping()
	}
}