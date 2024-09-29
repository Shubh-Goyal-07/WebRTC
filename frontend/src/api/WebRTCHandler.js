// src/api/WebRTCHandler.js
class WebRTCHandler {
    constructor(socket, meetingCode, userName) {
        this.socket = socket;
        this.meetingCode = meetingCode;
        this.userName = userName;
        this.peerConnections = {};
        this.localStream = null;

        this.setupSocketListeners();
    }

    async initializeMedia() {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = this.localStream;
    }

    createPeerConnection(userName, didIOffer) {
        const pc = new RTCPeerConnection();
        this.peerConnections[userName] = pc;

        // Add local stream to the peer connection
        this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('sendIceCandidateToSignalingServer', {
                    didIOffer,
                    iceUserName: userName,
                    iceCandidate: event.candidate,
                    meetingCode: this.meetingCode
                });
            }
        };

        pc.ontrack = (event) => {
            const remoteVideo = document.getElementById('remoteVideo');
            remoteVideo.srcObject = event.streams[0];
        };

        return pc;
    }

    async createOffer(userName) {
        
        const pc = this.createPeerConnection(userName, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        this.socket.emit('newOffer', {
            offer: pc.localDescription,
            offererUserName: userName,
            meetingCode: this.meetingCode
        });
    }

    async handleNewAnswer(answer, offererUserName) {
        const pc = this.peerConnections[offererUserName];
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    setupSocketListeners() {
        this.socket.on('availableOffers', (offers) => {
            offers.forEach((offer) => {
                const pc = this.createPeerConnection(offer.offererUserName, false);
                pc.setRemoteDescription(new RTCSessionDescription(offer.offer));
                pc.createAnswer()
                    .then(answer => {
                        pc.setLocalDescription(answer);
                        this.socket.emit('newAnswer', {
                            answer,
                            offererUserName: offer.offererUserName,
                            meetingCode: this.meetingCode
                        });
                    });
            });
        });

        this.socket.on('receivedIceCandidateFromServer', (iceCandidate) => {
            const pc = this.peerConnections[iceCandidate.userName];
            if (pc) {
                pc.addIceCandidate(new RTCIceCandidate(iceCandidate));
            }
        });
    }
}

export default WebRTCHandler;
