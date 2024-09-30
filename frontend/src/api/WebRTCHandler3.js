import io from 'socket.io-client';


const iceServers = [
    { urls: "stun.l.google.com:19302" },
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
        // this.socket = io.connect('http://172.31.12.101:8181');  // Adjust server URL as necessary
        // this.socket = io.connect('http://172.31.98.115:8181')
        this.socket = io.connect('http://35.200.188.94:80')

        this.meetID = meetID;
        this.userName = userName;
        this.clients = [];
        this.peerConnections = {};
        this.localStream = null;

        // Audio/Video status flags
        this.audioEnabled = true;
        this.videoEnabled = true;

        // Set up socket listeners (only once)
        this.setupSocketListeners();

        console.log('WebRTCHandler initialized');
    }

    // Initialize media streams (video & audio)
    async initializeMedia() {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = this.localStream;
        console.log('Media initialized');
    }

    // Toggle audio (mute/unmute)
    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        this.localStream.getAudioTracks().forEach(track => track.enabled = this.audioEnabled);
        console.log(`Audio ${this.audioEnabled ? 'enabled' : 'disabled'}`);
    }

    // Toggle video (on/off)
    toggleVideo() {
        this.videoEnabled = !this.videoEnabled;
        this.localStream.getVideoTracks().forEach(track => track.enabled = this.videoEnabled);
        console.log(`Video ${this.videoEnabled ? 'enabled' : 'disabled'}`);
    }

    // Join a meeting by emitting an event to the server
    async joinMeeting() {
        this.socket.emit('joinMeeting', { meetingCode: this.meetID, userName: this.userName });
        console.log('Joining meeting:', this.meetID);

        // Listen for existing clients when joining
        this.socket.on('existingClients', (clients) => {
            console.log('Existing clients:', clients);
            this.clients = clients;

            clients.forEach(client => {
                this.createPeerConnection(client, false);
                this.sendOfferToServer(client);  // Send offer to all existing clients
            });
        });

        // Handle errors (e.g., meeting not found)
        this.socket.on('error', (error) => {
            console.log('Error:', error);
            window.location.href = '/';  // Redirect back to home page on error
        });
    }

    // Create or retrieve a peer connection with the specified user
    async createPeerConnection(userName, didIOffer) {
        if (this.peerConnections[userName]) {
            console.log(`PeerConnection with ${userName} already exists.`);
            return this.peerConnections[userName];
        }

        try {
            console.log(`Creating PeerConnection with ${userName}`);
            const pc = new RTCPeerConnection(iceServers);
            this.peerConnections[userName] = pc;    
        
            console.log("Connection established with", userName);
            console.log("Generating ICE candidates for", userName);
            
            // add data channel to peer connection
            const dataChannel = pc.createDataChannel("testChannel");

            // Add local stream tracks to the peer connection
            this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));

            // Handle receiving remote stream
            pc.ontrack = (event) => {
                console.log(`Receiving remote stream from ${userName}`);

                const remoteVideoElement_pro = document.getElementById(`remoteVideo_${userName}`);
                
                // If not, create a new video element dynamically
                if (!remoteVideoElement_pro) {
                    const remoteVideoElement = document.createElement('video');
                    remoteVideoElement.id = `remoteVideo_${userName}`;
                    remoteVideoElement.autoplay = true;
                    remoteVideoElement.playsInline = true;
                    remoteVideoElement.style.width = '300px';  // Set size/style as needed

                    // Append the video element to the DOM (e.g., to a container)
                    document.getElementById('remoteVideoContainer').appendChild(remoteVideoElement);
                }


                if (remoteVideoElement_pro) {
                    remoteVideoElement_pro.srcObject = event.streams[0];
                }
            };

            // ICE Candidate search
            pc.onicecandidate = (event) => {
                console.log(`ICE candidate generated for ${userName}`);

                if (event.candidate) {
                    console.log(`Sending ICE candidate to ${userName}`);

                    this.socket.emit('sendIceCandidateToSignalingServer', {
                        iceCandidate: event.candidate,
                        targetUserName: userName,
                        meetingCode: this.meetID
                    });
                }
            };

            return pc;
        } catch (error) {
            console.error("Error creating PeerConnection:", error);
        }
    }

    // Send an offer to the server for the specified peer
    async sendOfferToServer(peerUserName) {
        const pc = this.peerConnections[peerUserName];
        if (!pc) {
            console.error(`PeerConnection for ${peerUserName} not found`);
            return;
        }

        const offer = await pc.createOffer();
        if (pc.signalingState === 'have-local-offer') {
            console.log('Local offer already created and set, skipping.');
            return;  // Prevent sending multiple offers
        }

        await pc.setLocalDescription(offer);

        const offerObject = {
            type: offer.type,
            sdp: offer.sdp,
        };

        // Emit the offer to the server
        this.socket.emit('newOffer', {
            offer: offerObject,
            userName: this.userName,
            meetingCode: this.meetID,
            targetUserName: peerUserName
        });

        console.log('Offer emitted for user:', peerUserName);
    }

    // Handle receiving an offer and respond with an answer
    async handleOffer(offer, offererUserName) {
        const pc = await this.createPeerConnection(offererUserName, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const answerObject = {
            type: answer.type,
            sdp: answer.sdp,
        };

        // Emit the answer to the server
        this.socket.emit('newAnswer', {
            answer: answerObject,
            userName: this.userName,
            meetingCode: this.meetID,
            offererUserName: offererUserName
        });

        console.log('Answer emitted for user:', offererUserName);
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
        // Handle when a new client joins the meeting
        this.socket.on('newClientJoined', ({ userName }) => {
            console.log(`${userName} joined the meeting.`);
            this.handleNewClientJoined(userName);
        });

        // Handle receiving an offer from another client
        this.socket.on('receiveOffer', async ({ offer, offererUserName }) => {
            console.log(`Received offer from ${offererUserName} at ${new Date().toISOString()}`);
            this.handleOffer(offer, offererUserName);
        });

        // Handle receiving an answer from another client
        this.socket.on('answerResponse', async ({ answer, answererUserName }) => {
            console.log('Received answer from:', answererUserName);

            const pc = this.peerConnections[answererUserName];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });


        // Handle receiving ICE candidates from another client
        this.socket.on('receiveIceCandidate', (iceCandidate, userName) => {
            const pc = this.peerConnections[userName];
            if (pc) {
                console.log(`Received ICE candidate from ${userName}`);
                pc.addIceCandidate(new RTCIceCandidate(iceCandidate));
            }
        });
    }
}

export default WebRTCHandler;