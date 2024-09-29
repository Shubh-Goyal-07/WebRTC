import io from 'socket.io-client';

class WebRTCHandler {
    constructor(meetID, userName) {
        this.socket = io.connect('http://172.31.12.101:8181');
        this.meetID = meetID;
        this.userName = userName;
        this.peerConnections = {};
        this.localStream = null;

        this.setupSocketListeners();
    }

    async initializeMedia() {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = this.localStream;

        console.log('Media initialized');
    }

    async joinMeeting() {
        this.socket.emit('joinMeeting', { meetID: this.meetID, userName: this.userName });
    
        this.socket.on('existingClients', (clients) => {
            console.log('Existing clients:', clients);
        });
    }

    setupSocketListeners() {
        this.socket.on('newClientJoined', ({ userName }) => {
            console.log(`${userName} joined the meeting.`);
        });
    }
}

export default WebRTCHandler;