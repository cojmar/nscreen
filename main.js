new class {
	constructor() {
		this.my_room = "N-screen-room-" + this.uid();


		//document.getElementById('video_link').innerHTML(window.location.href + btoa(this.my_room))


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
				let now = Date.now() / 100
				if (this.last_got) {
					if (now - this.last_got < 1.5) return
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
		if (!this.frame) return;
		this.net.send_cmd('img_frame', this.frame)
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
	computeFrame() {
		if (!this.videoTrack) return
		this.canvas = document.createElement("canvas");
		this.canvas.width = this.videoTrack.getSettings().width / 2;
		this.canvas.height = this.videoTrack.getSettings().height / 2;

		let canvasContext = this.canvas.getContext("2d");
		canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
		canvasContext.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
		this.frame = this.canvas.toDataURL('image/jpg', 0.7);
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