import io from 'socket.io-client';

const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.l.google.com:5349" },
    { urls: "stun:stun1.l.google.com:3478" },
    { urls: "stun:stun1.l.google.com:5349" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:5349" },
    { urls: "stun:stun3.l.google.com:3478" },
    { urls: "stun:stun3.l.google.com:5349" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:5349" }
];

class WebRTCHandler {
    constructor(meetID, userName) {
        this.socket = io.connect('http://35.200.188.94:80'); // Adjust server URL as necessary
        this.meetID = meetID;
        this.userName = userName;
        this.clients = [];
        this.peerConnections = {};
        this.localStream = null;
        this.audioEnabled = true;
        this.videoEnabled = true;

        this.setupSocketListeners();
    }

    // Initialize media streams (video & audio)
    async initializeMedia() {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = this.localStream;
    }

    // Toggle audio (mute/unmute)
    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        this.localStream.getAudioTracks().forEach(track => track.enabled = this.audioEnabled);
    }

    // Toggle video (on/off)
    toggleVideo() {
        this.videoEnabled = !this.videoEnabled;
        this.localStream.getVideoTracks().forEach(track => track.enabled = this.videoEnabled);
    }

    // Join a meeting
    async joinMeeting() {
        this.socket.emit('joinMeeting', { meetingCode: this.meetID, userName: this.userName });

        // Listen for existing clients when joining
        this.socket.on('existingClients', (clients) => {
            this.clients = clients;
            clients.forEach(client => {
                this.createPeerConnection(client, false);
                this.sendOfferToServer(client);  // Send offer to all existing clients
            });
        });

        // Handle errors (e.g., meeting not found)
        this.socket.on('error', (error) => {
            window.location.href = '/';  // Redirect back to home page on error
        });
    }

    // Create or retrieve a peer connection with the specified user
    async createPeerConnection(userName, didIOffer) {
        if (this.peerConnections[userName]) return this.peerConnections[userName];

        const pc = new RTCPeerConnection(iceServers);
        this.peerConnections[userName] = pc;

        // Add local stream tracks to the peer connection
        this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));

        // Handle receiving remote stream
        let remoteStream = new MediaStream();
        const remoteVideoElement = document.getElementById(`remoteVideo_${userName}`) || this.createRemoteVideoElement(userName);
        remoteVideoElement.srcObject = remoteStream;

        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
        };

        // ICE Candidate search
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('sendIceCandidateToSignalingServer', {
                    iceCandidate: event.candidate,
                    targetUserName: userName,
                    meetingCode: this.meetID
                });
            }
        };

        return pc;
    }

    // Create video element dynamically for remote user
    createRemoteVideoElement(userName) {
        const remoteVideoElement = document.createElement('video');
        remoteVideoElement.id = `remoteVideo_${userName}`;
        remoteVideoElement.autoplay = true;
        remoteVideoElement.playsInline = true;
        remoteVideoElement.style.width = '300px';
        remoteVideoElement.style.height = '300px';
        remoteVideoElement.muted = true;
        remoteVideoElement.style.backgroundColor = 'black';
        remoteVideoElement.style.margin = '10px';

        const container = document.getElementById('remoteVideoContainer');
        container.appendChild(remoteVideoElement);

        return remoteVideoElement;
    }

    // Send an offer to the server for the specified peer
    async sendOfferToServer(peerUserName) {
        const pc = this.peerConnections[peerUserName];
        if (!pc) return;

        const offer = await pc.createOffer();
        if (pc.signalingState === 'have-local-offer') return;  // Prevent sending multiple offers

        await pc.setLocalDescription(offer);

        this.socket.emit('newOffer', {
            offer: {
                type: offer.type,
                sdp: offer.sdp,
            },
            userName: this.userName,
            meetingCode: this.meetID,
            targetUserName: peerUserName
        });
    }

    // Handle receiving an offer and respond with an answer
    async handleOffer(offer, offererUserName) {
        const pc = await this.createPeerConnection(offererUserName, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.socket.emit('newAnswer', {
            answer: {
                type: answer.type,
                sdp: answer.sdp,
            },
            userName: this.userName,
            meetingCode: this.meetID,
            offererUserName: offererUserName
        });
    }

    // Handle a new client joining the meeting
    async handleNewClientJoined(userName) {
        if (!this.clients.includes(userName)) {
            this.clients.push(userName);
            this.createPeerConnection(userName, false);
        }
    }

    // Set up socket listeners for events (new clients, offers, answers)
    setupSocketListeners() {
        this.socket.on('newClientJoined', ({ userName }) => {
            this.handleNewClientJoined(userName);
        });

        this.socket.on('receiveOffer', async ({ offer, offererUserName }) => {
            this.handleOffer(offer, offererUserName);
        });

        this.socket.on('answerResponse', async ({ answer, answererUserName }) => {
            const pc = this.peerConnections[answererUserName];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        this.socket.on('receiveIceCandidate', (iceCandidate, userName) => {
            const pc = this.peerConnections[userName];
            if (pc) {
                pc.addIceCandidate(new RTCIceCandidate(iceCandidate));
            }
        });
    }

    // Clean up the WebRTC connections
    cleanup() {
        Object.keys(this.peerConnections).forEach(userName => {
            this.peerConnections[userName].close();
            delete this.peerConnections[userName];
        });

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

export default WebRTCHandler;
