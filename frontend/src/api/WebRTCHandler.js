// WebRTCHandler.js
import io from 'socket.io-client';

// read config.json
const config = require('./config.json');
// Set the base URL for the API
const baseURL = config.baseURL;

class WebRTCHandler {
    constructor(meetingCode, userName, localStream, remoteVideoContainer) {
        this.socket = io(baseURL); // Connecting to signaling server
        this.peerConnections = {}; // Store peer connections
        this.meetingCode = meetingCode;
        this.userName = userName;
        this.localStream = localStream;
        this.remoteVideoContainer = remoteVideoContainer;

        this.setupSocketListeners();
    }

    // Start by creating a peer connection and gather ICE candidates for your user
    createPeerConnection(toUserName) {
        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], // Using Google's public STUN server
        });

        // Add local stream (your media tracks) to the connection
        this.localStream.getTracks().forEach(track => peerConnection.addTrack(track, this.localStream));

        // Send local ICE candidates to the signaling server to be relayed to peers
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                // Send only to the signaling server; it will be relayed to the remote peer
                this.socket.emit('iceCandidate', {
                    candidate: event.candidate,
                    meetingCode: this.meetingCode,
                    from: this.userName, // Current user
                    to: toUserName, // Send to the remote peer
                });
            }
        };

        // Handle receiving remote streams (add their media to the UI)
        this.handleRemoteStream(peerConnection);

        return peerConnection;
    }

    setupSocketListeners() {
        // Join the signaling server and the meeting room
        this.socket.emit('joinMeeting', { meetingCode: this.meetingCode, userName: this.userName });

        // Listen for available offers from signaling server
        this.socket.on('availableOffers', async (offers) => {
            // Handle offers from other peers in the meeting
            for (let offer of offers) {
                const peerConnection = this.createPeerConnection(offer.from); // Create a new connection to that peer
                await this.createAnswer(offer.sdp, peerConnection, offer.from); // Answer the offer
            }
        });

        // Listen for new offer when a peer joins the meeting
        this.socket.on('newOfferAwaiting', async ({ sdp, from }) => {
            const peerConnection = this.createPeerConnection(from); // Create a new connection
            await this.createAnswer(sdp, peerConnection, from); // Answer the new peer
        });

        // Listen for an answer from a peer (via signaling server)
        this.socket.on('newAnswerAwaiting', ({ sdp, from }) => {
            this.handleAnswerFromPeer(sdp, from); // Complete the connection setup with the peer
        });

        // Listen for incoming ICE candidates from peers (via signaling server)
        this.socket.on('receiveIceCandidate', ({ candidate, from }) => {
            // Add the remote ICE candidate to the correct peer connection
            if (this.peerConnections[from]) {
                this.peerConnections[from].addIceCandidate(new RTCIceCandidate(candidate));
            }
        });
    }

    // Create and send an offer to the signaling server
    async createOffer(toUserName) {
        const peerConnection = this.createPeerConnection(toUserName); // Create a new peer connection

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Send the offer to the signaling server, which will forward it to the remote peer
        this.socket.emit('offer', {
            meetingCode: this.meetingCode,
            from: this.userName, // Current user
            to: toUserName, // Remote peer
            sdp: peerConnection.localDescription, // SDP offer
        });

        // Store the peer connection
        this.peerConnections[toUserName] = peerConnection;
    }

    // Handle incoming offers by creating and sending an answer
    async createAnswer(offerSdp, peerConnection, fromUserName) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp)); // Set remote offer as the connection description
        const answer = await peerConnection.createAnswer(); // Create an answer
        await peerConnection.setLocalDescription(answer); // Set your local description

        // Send the answer back to the peer via the signaling server
        this.socket.emit('answer', {
            to: fromUserName, // Peer who sent the offer
            from: this.userName, // Current user
            sdp: peerConnection.localDescription, // SDP answer
        });

        // Store the peer connection
        this.peerConnections[fromUserName] = peerConnection;
    }

    // Handle incoming answers from peers (received via signaling server)
    handleAnswerFromPeer(sdp, fromUserName) {
        const peerConnection = this.peerConnections[fromUserName];
        const remoteDesc = new RTCSessionDescription(sdp);
        peerConnection.setRemoteDescription(remoteDesc);
    }

    // Handle receiving and displaying remote streams from peers
    handleRemoteStream(peerConnection) {
        peerConnection.ontrack = event => {
            const remoteStream = event.streams[0];
            const videoElement = document.createElement('video');
            videoElement.srcObject = remoteStream;
            videoElement.autoplay = true;
            videoElement.style.width = '200px';
            this.remoteVideoContainer.appendChild(videoElement);
        };
    }
}

export default WebRTCHandler;
