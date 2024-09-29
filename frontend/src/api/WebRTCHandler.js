class WebRTCHandler {
    constructor(socket, meetingCode, userName) {
        this.socket = socket;
        this.meetingCode = meetingCode;
        this.userName = userName;
        this.peerConnections = {}; // Store all peer connections
        this.localStream = null;
        this.setupSocketListeners();
    }

    async initializeMedia() {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // Assuming you have a local video element with id 'localVideo'
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = this.localStream;
    }

    createPeerConnection(userName, isOfferer) {
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' } // Example STUN server
            ]
        });

        this.peerConnections[userName] = peerConnection; // Store the connection

        // Add tracks from local stream to peer connection
        this.localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, this.localStream);
        });

        // ICE candidate handling
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('sendIceCandidateToSignalingServer', {
                    iceUserName: userName,
                    iceCandidate: event.candidate,
                    meetingCode: this.meetingCode,
                    didIOffer: isOfferer
                });
            }
        };

        // Handle incoming tracks
        peerConnection.ontrack = (event) => {
            const remoteVideo = document.getElementById('remoteVideo'); // Adjust as necessary
            remoteVideo.srcObject = event.streams[0];
        };

        return peerConnection;
    }

    setupSocketListeners() {
        // Listen for available offers when joining a meeting
        this.socket.on('availableOffers', (offers) => {
            offers.forEach((offer) => {
                this.createPeerConnection(offer.offererUserName, false);
                this.peerConnections[offer.offererUserName].setRemoteDescription(new RTCSessionDescription(offer.offer))
                    .then(() => {
                        return this.peerConnections[offer.offererUserName].createAnswer();
                    })
                    .then(answer => {
                        return this.peerConnections[offer.offererUserName].setLocalDescription(answer);
                    })
                    .then(() => {
                        this.socket.emit('newAnswer', {
                            answer: this.peerConnections[offer.offererUserName].localDescription,
                            offererUserName: offer.offererUserName,
                            meetingCode: this.meetingCode
                        });
                    })
                    .catch(error => {
                        console.error('Error handling offer:', error);
                    });
            });
        });

        this.socket.on('receivedIceCandidateFromServer', (iceCandidate) => {
            const peerConnection = this.peerConnections[iceCandidate.userName];
            if (peerConnection) {
                peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
            }
        });
    }
}

export default WebRTCHandler;
