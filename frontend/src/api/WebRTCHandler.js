class WebRTCHandler {
    constructor(socket, localVideo, remoteVideo) {
        this.socket = socket;
        this.localVideo = localVideo;
        this.remoteVideo = remoteVideo;
        this.localStream = null;
        this.peerConnections = {}; // Store peer connections based on offerer's username

        this.bindSocketEvents();
    }

    bindSocketEvents() {
        this.socket.on('availableOffers', (offers) => {
            offers.forEach(offer => {
                this.handleIncomingOffer(offer);
            });
        });

        this.socket.on('answerResponse', (answerObj) => {
            this.handleAnswerResponse(answerObj);
        });
    }

    async getMediaStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.localVideo.srcObject = this.localStream;
        } catch (error) {
            console.error('Error accessing media devices.', error);
        }
    }

    async createOffer(userName, meetingCode) {
        const peerConnection = new RTCPeerConnection();
        this.localStream.getTracks().forEach(track => peerConnection.addTrack(track, this.localStream));

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('newOffer', {
                    iceCandidates: [event.candidate],
                    userName,
                    meetingCode
                });
            }
        };

        peerConnection.ontrack = (event) => {
            this.remoteVideo.srcObject = event.streams[0];
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Store peer connection
        this.peerConnections[userName] = peerConnection;
    }

    async handleIncomingOffer(offerObj) {
        const peerConnection = new RTCPeerConnection();
        this.localStream.getTracks().forEach(track => peerConnection.addTrack(track, this.localStream));

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('newAnswer', [{
                    meetingCode: offerObj.meetingCode,
                    offererUserName: offerObj.offererUserName,
                    answererUserName: offerObj.answererUserName,
                    answererIceCandidates: [event.candidate]
                }], (offerIceCandidates) => {
                    offerIceCandidates.forEach(candidate => peerConnection.addIceCandidate(new RTCIceCandidate(candidate)));
                });
            }
        };

        peerConnection.ontrack = (event) => {
            this.remoteVideo.srcObject = event.streams[0];
        };

        const remoteDesc = new RTCSessionDescription(offerObj.offer);
        await peerConnection.setRemoteDescription(remoteDesc);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Store peer connection
        this.peerConnections[offerObj.offererUserName] = peerConnection;
    }

    handleAnswerResponse(answerObj) {
        const peerConnection = this.peerConnections[answerObj.offererUserName];
        if (peerConnection) {
            peerConnection.addIceCandidate(new RTCIceCandidate(answerObj.answererIceCandidates));
        }
    }
}

export default WebRTCHandler;
