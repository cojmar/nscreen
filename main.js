new class {
	constructor() {
		this.my_room = "N-screen-room-" + this.uid();
		this.last_true_sent = Date.now() / 1000 - 10
		this.dif_map = false
		this.streaming = false
		import (`./network.js`).then((module) => {
			this.net = new module.default();
			this.net.on('connect', () => {
				this.net.send_cmd('auth', { 'user': '', 'room': this.my_room })
			})
			this.net.on('auth.info', () => {
				this.start()
			})
			this.net.on('got', () => {
				let now = Date.now()
				if (this.last_got) {
					if (now - this.last_got < 50) return
				}
				this.last_got = now
				this.sendScreen()
			})
			this.net.connect('wss://ws.emupedia.net')
		})
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
			this.timerCallback();
			this.sendScreen()
		} catch (err) {
			console.error("Error: " + err);
		}
	}
	sendScreen() {
		if (this.dif_map) {
			let my_map = JSON.stringify(Array.from(this.dif_map))
			this.net.send_cmd('img_part', LZUTF8.compress(my_map, { outputEncoding: "StorageBinaryString" }))
			return
		}
		if (!this.frame) return;
		this.net.send_cmd('img_frame', LZUTF8.compress(this.frame, { outputEncoding: "StorageBinaryString" }))
	}
	stopCapture(evt) {
		let tracks = this.video.srcObject.getTracks();
		tracks.forEach(track => track.stop());
		this.video.srcObject = null;
		this.streaming = false
	}
	copyToClipboard(str) {
		const el = document.createElement('textarea');
		el.value = str;
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
	}
	timerCallback() {
		if (!this.streaming) return
		this.computeFrame()
		setTimeout(() => {
			this.timerCallback();
		}, 10);
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
	computeFrame() {
		if (!this.videoTrack) return
		this.canvas = document.createElement("canvas");
		this.canvas.width = this.videoTrack.getSettings().width;
		this.canvas.height = this.videoTrack.getSettings().height;

		let canvasContext = this.canvas.getContext("2d");
		canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
		canvasContext.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
		if (this.img_buffer) this.old_buffer = this.img_buffer
		this.img_buffer = canvasContext.getImageData(0, 0, this.canvas.width, this.canvas.height)
		let now = Date.now() / 1000

		if (!this.old_buffer || now - this.last_true_sent > 3) {
			this.frame = this.canvas.toDataURL('image/png')
				//this.dif_map = false
			if (now - this.last_true_sent > 4) {
				this.last_true_sent = now
			}
			return
		}
		let myImageData = canvasContext.createImageData(this.canvas.width, this.canvas.height);
		let dif_map = new Map();

		for (let i = 0; i < this.img_buffer.data.length; i += 4) {
			let pixel = [this.img_buffer.data[i], this.img_buffer.data[i + 1], this.img_buffer.data[i + 2], this.img_buffer.data[i + 3]].join('-')
			let pixel_old = false
			if (this.old_buffer.data[i] && this.old_buffer.data[i + 1] && this.old_buffer.data[i + 2] && this.old_buffer.data[i + 3]) {
				pixel_old = [this.old_buffer.data[i], this.old_buffer.data[i + 1], this.old_buffer.data[i + 2], this.old_buffer.data[i + 3]].join('-')
			}
			if (pixel != pixel_old) {
				dif_map.set(i, this.img_buffer.data[i])
				dif_map.set(i + 1, this.img_buffer.data[i + 1])
				dif_map.set(i + 2, this.img_buffer.data[i + 2])
				dif_map.set(i + 3, this.img_buffer.data[i + 3])
					// myImageData.data[i] = this.img_buffer.data[i]
					// myImageData.data[i + 1] = this.img_buffer.data[i + 1]
					// myImageData.data[i + 2] = this.img_buffer.data[i + 2]
					// myImageData.data[i + 3] = this.img_buffer.data[i + 3]
			}
		}
		this.dif_map = dif_map
		return
		canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
		canvasContext.putImageData(myImageData, 0, 0);
		this.frame = this.canvas.toDataURL('image/png')

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