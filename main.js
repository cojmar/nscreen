new class {
	constructor() {
		this.my_room = "N-screen-room-" + this.uid();
		this.last_true_sent = Date.now() / 1000 - 10
		this.send_screen_timeout = false
		this.streaming = false
		this.auto_ping = true;
		this.max_time_per_ping = 1
		this.resolution = [1280, 768]
		this.resolution = [800, 600]
		import (`./network.js`).then((module) => {
			this.net = new module.default();
			this.net.on('connect', () => {
				this.net.send_cmd('auth', { 'user': '', 'room': 'N-screen-lobby' })
			})
			this.net.on('auth.info', () => {
				this.net.send_cmd('join', this.my_room)
				this.start()
			})
			this.net.on('get_img', () => {
				if (!this.auto_ping) this.ping()
			})
			this.net.on('room.data', (d) => {
				if (d.data.update) this.ping()
			})
			this.net.connect('wss://ws.emupedia.net')
		})
	}
	ping() {
		//return this.sendScreen()
		if (this.send_screen_timeout === false) this.send_screen_timeout = setTimeout(() => {
			this.sendScreen()
			this.send_screen_timeout = false
		}, this.max_time_per_ping)
	}
	start() {

		document.getElementById('main').style.display = 'block';
		this.video = document.getElementById("video");
		this.logElem = document.getElementById("log");
		this.startElem = document.getElementById("start");
		this.stopElem = document.getElementById("stop");
		let url = (window.location.href.indexOf('localhost') !== -1) ? window.location.href + '404.html#' + btoa(this.my_room) : window.location.href + btoa(this.my_room)
		let video_link = document.getElementById("video_link")
		video_link.innerHTML = `<a href="#">${url}</a>`
		video_link.addEventListener('click', (e) => {
			e.preventDefault()
			this.copyToClipboard(url);
			document.getElementById("status").innerHTML = "Link copied to clipboard!"
			setTimeout(() => document.getElementById("status").innerHTML = "", 2000)
		})


		this.startElem.addEventListener("click", (evt) => {
			this.startCapture();
		}, false);

		this.stopElem.addEventListener("click", (evt) => {
			this.stopCapture();
		}, false);


		this.ping()

	}
	async startCapture() {
		try {
			this.video.srcObject = await navigator.mediaDevices.getDisplayMedia({
				video: {
					cursor: "always"
				},
				audio: false
			});
			this.streaming = true
			this.videoTrack = this.video.srcObject.getVideoTracks()[0]

		} catch (err) {
			console.error("Error: " + err);
		}
	}
	sendScreen() {
		this.computeFrame();
		if (!this.frame) {
			setTimeout(() => this.sendScreen(), 10)
			return;
		}

	}
	stopCapture(evt) {
		this.streaming = false
		let tracks = this.video.srcObject.getTracks();
		tracks.forEach(track => track.stop());
		this.video.srcObject = null;

	}
	copyToClipboard(str) {
		const el = document.createElement('textarea');
		el.value = str;
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
	}
	getColorIndicesForCoord(x, y) {
		const width = this.canvas.width
		const red = y * (width * 4) + x * 4;
		return [red, red + 1, red + 2, red + 3];
	}
	getPixel(x, y, imageData) {
		const colorIndices = this.getColorIndicesForCoord(x, y);
		const [redIndex, greenIndex, blueIndex, alphaIndex] = colorIndices;
		return [imageData.data[redIndex], imageData.data[greenIndex], imageData.data[blueIndex], imageData.data[alphaIndex]];
	}
	exportCanvas() {
		this.canvas.toBlob((data) => {
			data.arrayBuffer().then(buffer => {
				let frame = BSON.Binary(pako.deflate(new Uint8Array(buffer)))
				this.net.send_cmd('frame', frame)
				this.frame = frame
				if (this.auto_ping) this.ping();
				//console.log(this.frame)
				//this.net.send_cmd('set_room_data', { "frame": false, silent: 1 })
				//this.net.send_cmd('set_room_data', { "frame": this.frame })
				//this.net.send_cmd('set_room_data', { "update": 1 })
				//this.send_data(new BSON.Binary(new Uint8Array(buffer)))
			});
		})
	}
	computeFrame() {

		if (!this.streaming) return
		if (!this.canvas) {
			this.canvas = document.createElement("canvas");
			this.canvas.width = this.resolution[0]
			this.canvas.height = this.resolution[1]
			this.canvasContext = this.canvas.getContext("2d");
		}

		this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.canvasContext.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
		if (this.img_buffer) this.old_buffer = this.img_buffer
		this.img_buffer = this.canvasContext.getImageData(0, 0, this.canvas.width, this.canvas.height)
		let now = Date.now() / 1000

		if (!this.old_buffer || now - this.last_true_sent > 15) {
			//this.frame = this.canvas.toDataURL('image/png', 1)

			//this.dif_map = false
			if (now - this.last_true_sent > 16) {
				this.last_true_sent = now
			}
			return this.exportCanvas()
		}
		let myImageData = this.canvasContext.createImageData(this.canvas.width, this.canvas.height);


		for (let i = 0; i < this.img_buffer.data.length; i += 4) {
			let pixel = [this.img_buffer.data[i], this.img_buffer.data[i + 1], this.img_buffer.data[i + 2], this.img_buffer.data[i + 3]].join('-')
			let pixel_old = false
			if (this.old_buffer.data[i] && this.old_buffer.data[i + 1] && this.old_buffer.data[i + 2] && this.old_buffer.data[i + 3]) {
				pixel_old = [this.old_buffer.data[i], this.old_buffer.data[i + 1], this.old_buffer.data[i + 2], this.old_buffer.data[i + 3]].join('-')
			}
			if (pixel != pixel_old) {
				myImageData.data[i] = this.img_buffer.data[i]
				myImageData.data[i + 1] = this.img_buffer.data[i + 1]
				myImageData.data[i + 2] = this.img_buffer.data[i + 2]
				myImageData.data[i + 3] = this.img_buffer.data[i + 3]
			}
		}
		this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.canvasContext.putImageData(myImageData, 0, 0);
		return this.exportCanvas()
			//this.frame = this.canvas.toDataURL('image/jpg', 0.4)
	}
	uuid() {
		let d = new Date().getTime();
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			let r = (d + Math.random() * 16) % 16 | 0;
			d = Math.floor(d / 16);
			return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16);
		});
	}
	hash(str) {
		let hash = 5381,
			i = str.length;
		while (i) {
			hash = (hash * 33) ^ str.charCodeAt(--i);
		}
		return hash >>> 0;
	}
	uid() {
		let ret = Math.floor(Date.now() / 1000) + '-' + this.hash(this.uuid());
		return ret;
	}
}