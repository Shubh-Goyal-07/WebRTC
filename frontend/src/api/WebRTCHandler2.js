import io from 'socket.io-client';

class WebRTCHandler {
    constructor(meetID, userName) {
        this.socket = io.connect('http://172.31.12.101:8181');
        this.meetID = meetID;
        this.userName = userName;
        this.clients = [];
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
        this.socket.emit('joinMeeting', { meetingCode: this.meetID, userName: this.userName });

        console.log('Joining meeting:', this.meetID);
    
        this.socket.on('existingClients', (clients) => {
            console.log('Existing clients:', clients);
            this.clients = clients;

            clients.forEach(client => {
                this.createPeerConnection(client, false);
                this.sendOfferToServer(client);
            });
        });
    }

    async createPeerConnection(userName, didIOffer) {
        const pc = new RTCPeerConnection();
        this.peerConnections[userName] = pc;
        return pc;
    }


    async sendOfferToServer(peerUserName) {
        const pc = this.peerConnections[peerUserName];
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const offer_object = {
            type: offer.type,
            sdp: offer.sdp,
        }

        this.socket.emit('newOffer', {
            offer: offer_object,
            userName: this.userName,
            meetingCode: this.meetID,
            targetUserName: peerUserName    
        });

        console.log('Offer emitted for user:', peerUserName);
    }

    async handleOffer(offer, offererUserName) {
        const pc = await this.createPeerConnection(offererUserName, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const answer_object = {
            type: answer.type,
            sdp: answer.sdp,
        }

        this.socket.emit('newAnswer', {
            answer: answer_object,
            userName: this.userName,
            meetingCode: this.meetID,
            offererUserName: offererUserName
        });

        console.log('Answer emitted for user:', offererUserName);
    }

    async handleNewClientJoined(userName) {
        this.clients.push(userName);
        this.createPeerConnection(userName, false);
    }
        

    setupSocketListeners() {
        this.socket.on('newClientJoined', ({ userName }) => {
            console.log(`${userName} joined the meeting.`);
            this.clients.push(userName);
            this.createPeerConnection(userName, false);
        });

        this.socket.on('receiveOffer', async ({ offer, offererUserName }) => {
            console.log('Received offer from:', offererUserName);
            
            this.handleOffer(offer, offererUserName);
        });

        this.socket.on('answerResponse', async ({ answer, answererUserName }) => {
            console.log('Received answer from:', answererUserName);

            const pc = this.peerConnections[answererUserName];
            await pc.setRemoteDescription(new RTCSessionDescription(answer));

            // const pc2 = RTCPeerConnection();
        });
    }
}

export default WebRTCHandler;