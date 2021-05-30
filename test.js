new class {
	constructor() {
		this.my_room = "N-screen-room-TEST";
		this.last_true_sent = Date.now() / 1000 - 10
		this.send_screen_timeout = false
		this.streaming = false
		this.max_time_per_ping = 7
		this.resolution = [1024, 768]
		import (`./network.js`).then((module) => {
			this.net = new module.default();
			this.net.on('connect', () => {
				this.net.send_cmd('auth', { 'user': '', 'room': 'N-screen-lobby' })
			})
			this.net.on('auth.info', () => {
				this.net.send_cmd('join', this.my_room)
				this.start()
			})
			this.net.on('stream_data', s => this.get_data(s))
			this.net.connect('wss://ws.emupedia.net')
		})
	}
	send_screen() {
		this.send_data(this.computeFrame())
		setTimeout(() => {
			this.send_screen()
		}, 2000)
	}
	start() {
		this.init()
		this.send_screen()
	}
	init() {
		document.getElementById('main').style.display = 'block';
		this.video = document.getElementById("video");
		this.video.style.display = 'block'
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

			this.send_screen()
		} catch (err) {
			console.error("Error: " + err);
		}
	}
	stopCapture(evt) {
		this.streaming = false
		try {
			let tracks = this.video.srcObject.getTracks();
			tracks.forEach(track => track.stop());
		} catch (error) {
			this.video.srcObject = null;
		}
	}
	copyToClipboard(str) {
		const el = document.createElement('textarea');
		el.value = str;
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
	}
	send_data(data) {

		this.net.send_cmd('stream_data', data)
	}
	get_data(s) {
		let data = s.data.buffer

		var blob = new Blob([data, 'image/png']);
		console.log(blob)
			// Use createObjectURL to make a URL for the blob
		var image = new Image();
		image.src = URL.createObjectURL(blob);
		document.body.appendChild(image);

	}
	computeFrame() {
		if (!this.canvas) {
			this.canvas = document.createElement("canvas");
			this.canvas.width = this.resolution[0]
			this.canvas.height = this.resolution[1]
			this.canvasContext = this.canvas.getContext("2d");
		}
		this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.canvasContext.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
		this.canvas.toBlob((data) => {
			data.arrayBuffer().then(buffer => {
				this.send_data(new BSON.Binary(new Uint8Array(buffer)))
			});
		})


		//console.log(this.img_buffer)
		//return new BSON.Binary(this.img_buffer.data.buffer)
	}
	send_screen() {
		this.computeFrame()

		setTimeout(() => {
			this.computeFrame()
		}, 2000)
	}
}