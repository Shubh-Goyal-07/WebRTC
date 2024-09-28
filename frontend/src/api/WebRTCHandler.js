// WebRTCHandler.js
class WebRTCHandler {
    constructor(meetId, userName, socket, localVideo, remoteVideo) {
        this.meetId = meetId;
        this.userName = userName;
        this.socket = socket;
        this.localVideo = localVideo;
        this.remoteVideo = remoteVideo;

        // Create a peer connection with STUN server configuration
        const configuration = {
            iceServers: [
                {
                    urls: 'stun:stun.l.google.com:19302' // Google STUN server
                }
            ]
        };
        this.peerConnection = new RTCPeerConnection(configuration);
        this.init();
    }

    init() {
        this.setupSocketListeners();
        this.getUserMedia();
    }

    setupSocketListeners() {
        this.socket.on('availableOffers', (offers) => {
            offers.forEach(offer => {
                this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
                    .then(() => this.peerConnection.createAnswer())
                    .then(answer => this.peerConnection.setLocalDescription(answer))
                    .then(() => {
                        this.socket.emit('sendAnswer', {
                            answer: this.peerConnection.localDescription,
                            meetingCode: this.meetId,
                            userName: this.userName
                        });
                    })
                    .catch(err => console.error('Error handling offer:', err));
            });
        });

        this.socket.on('answerResponse', (answer) => {
            this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
                .catch(err => console.error('Error setting remote description:', err));
        });

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('newIceCandidate', {
                    iceCandidate: event.candidate,
                    meetingCode: this.meetId,
                    userName: this.userName
                });
            }
        };

        this.peerConnection.ontrack = (event) => {
            this.remoteVideo.current.srcObject = event.streams[0];
        };
    }

    getUserMedia() {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                this.localVideo.current.srcObject = stream;
                stream.getTracks().forEach(track => this.peerConnection.addTrack(track, stream));
                this.sendOffer();
            })
            .catch(err => console.error('Error accessing media devices.', err));
    }

    sendOffer() {
        this.peerConnection.createOffer().then(offer => {
            return this.peerConnection.setLocalDescription(offer);
        }).then(() => {
            this.socket.emit('newOffer', {
                offer: this.peerConnection.localDescription,
                meetingCode: this.meetId,
                userName: this.userName
            });
        });
    }
}

export default WebRTCHandler;
