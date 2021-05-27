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
			this.net.connect('wss://ws.emupedia.net')
		})
	}
	start() {
		document.getElementById('main').style.display = 'block';
		this.video = document.getElementById("video");
		this.logElem = document.getElementById("log");
		this.startElem = document.getElementById("start");
		this.stopElem = document.getElementById("stop");
		let url = window.location.href + btoa(this.my_room)
		document.getElementById("video_link").innerHTML = `<a href="${url}" target="_blank">url</a>`


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
		} catch (err) {
			console.error("Error: " + err);
		}
	}

	stopCapture(evt) {
		let tracks = this.video.srcObject.getTracks();
		tracks.forEach(track => track.stop());
		this.video.srcObject = null;
		this.videoTrack = null;
		this.streaming = false
	}
	timerCallback() {
		if (!this.streaming) return
		let frame = this.computeFrame()
		this.net.send_cmd('img_frame', frame)
		setTimeout(() => {
			this.timerCallback();
		}, 0);
	}
	computeFrame() {
		if (!this.videoTrack) return
		this.canvas = document.createElement("canvas");
		this.canvas.width = this.videoTrack.getSettings().width / 2;
		this.canvas.height = this.videoTrack.getSettings().height / 2;

		let canvasContext = this.canvas.getContext("2d");
		canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
		canvasContext.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
		return this.canvas.toDataURL('image/png');
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