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
				this.net.send_cmd('auth', { 'user': '', 'room': this.my_room })
			})
			this.net.on('room.info', () => {
				this.net.send_cmd('got')
			})
			this.net.on('img_part', (msg) => {

				let canvasContext = this.canvas.getContext("2d");
				let part = JSON.parse(LZUTF8.decompress(msg.data.part, { inputEncoding: "StorageBinaryString" }));
				let myImageData = canvasContext.createImageData(...msg.data.size);
				console.log(part.length)
				part.map((item) => myImageData.data[item[0]] = item[1])
				canvasContext.putImageData(myImageData, 0, 0);
				this.do_tick()
			})
			this.net.on('img_frame', (msg) => {
				this.frame = LZUTF8.decompress(msg.data, { inputEncoding: "StorageBinaryString" });
				this.render(this.frame)
				this.do_tick()

			})
			this.net.connect('wss://ws.emupedia.net')
			window.n = this.net
		})
	}
	do_tick() {
		if (this.tick) clearTimeout(this.tick);
		this.net.send_cmd('got')
		this.tick = setTimeout(() => {
			this.net.send_cmd('got')
			this.tick = false;
		}, 200)
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