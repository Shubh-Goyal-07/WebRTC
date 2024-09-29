const fs = require('fs');
const http = require('http');
const express = require('express');
const app = express();
const socketio = require('socket.io');
const mongoose = require('mongoose');
const uri = 'mongodb+srv://goyal23:sukriti2002@sde.0wnld.mongodb.net/?retryWrites=true&w=majority&appName=SDE'

app.use(express.json());

// MongoDB setup
// mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));
const meetingSchema = new mongoose.Schema({
    creator: String,
    meetingCode: String,
    clients: [String], // List of connected clients (usernames)
    offers: [{
        offererUserName: String,
        offer: Object,
        offerIceCandidates: [Object],
        answererUserName: String,
        answer: Object,
        answererIceCandidates: [Object]
    }]
});
const Meeting = mongoose.model('Meeting', meetingSchema);

app.use(express.static(__dirname));

// Function to generate random meeting code
function generateMeetingCode(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let meetingCode = '';
    for (let i = 0; i < length; i++) {
        meetingCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return meetingCode;
}

// A simple get route to print hello
app.get('/hello', (req, res) => {
    console.log("Hello World!");
    res.send('Hello World!');
});

// API Route for creating a meeting with random code generation
app.post('/createmeet', async (req, res) => {
    const { creator } = req.body;

    if (!creator) {
        return res.status(400).json({ error: "Creator is required." });
    }

    // Generate a unique meeting code
    let meetingCode;
    let isUnique = false;

    while (!isUnique) {
        meetingCode = generateMeetingCode();

        // Check if the code is unique
        const existingMeeting = await Meeting.findOne({ meetingCode });
        if (!existingMeeting) {
            isUnique = true;
        }
    }

    // Create new meeting
    const newMeeting = new Meeting({
        creator,
        meetingCode,
        clients: [], // Empty clients initially
        offers: []   // Empty offers initially
    });

    try {
        await newMeeting.save();
        res.status(201).json({ message: "Meeting created successfully", meetingCode });
        console.log('Meeting created successfully');
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
        console.log('Internal server error');
    }
});

const expressServer = http.createServer(app);

const io = socketio(expressServer, {
    cors: {
        origin: [
            // "*"
            // "http://localhost",
            'http://172.31.98.115',
            'http://172.31.12.101' // if using a phone or another computer
        ],
        methods: ["GET", "POST"]
    }
});

expressServer.listen(8181);

// Connected clients will be stored in memory
const connectedSockets = []; // { username, socketId, meetingCode }

// Handle socket connections
io.on('connection', (socket) => {
    console.log("Someone has connected");

    socket.once('joinMeeting', async ({ meetingCode, userName }) => {
        console.log("Joining meeting...", meetingCode);
    
        // Find the meeting in the database
        const meeting = await Meeting.findOne({ meetingCode });

        await Meeting.updateOne(
            { meetingCode },
            { $addToSet: { clients: userName } }  // Adds the userName only if it doesn't already exist
        );

        await meeting.save();
    
        // Track connected clients
        console.log("Connected clients", connectedSockets);
        if (!connectedSockets.find(client => client.userName === userName && client.meetingCode === meetingCode)) {
            connectedSockets.push({
                socketId: socket.id,
                userName,
                meetingCode
            });
        }
        console.log("Client added to connectedSockets");
        // Send the list of usernames of existing clients to the new client

        console.log(meeting.clients);
        const existingUsernames = meeting.clients.filter(client => client !== userName);
        socket.emit('existingClients', existingUsernames);
    
        // Add the client to the meeting's socket room
        socket.join(meetingCode);
        console.log("Client joined room");
        // Notify other clients in the meeting about the new client
        socket.broadcast.to(meetingCode).emit('newClientJoined', { userName });
        console.log(`${userName} joined meeting: ${meetingCode}`);
    });    


    socket.on('newOffer', async ({ offer, meetingCode, userName, targetUserName }) => {
        const newOffer = {
            offererUserName: userName,
            offer: offer,
            offerIceCandidates: [],  // You might want to handle ICE candidates separately
            answererUserName: null,  // Specify who the offer is intended for
            answer: null,
            answererIceCandidates: []
        };
        console.log(userName, targetUserName);
        // Fetch the meeting from the database
        const meeting = await Meeting.findOne({ meetingCode });
    
        if (!meeting) {
            socket.emit('error', 'Meeting not found');
            return;
        }
    
        // Store the new offer in the database
        await Meeting.updateOne(
            { meetingCode },
            { $push: { offers: newOffer } }
        );
    
        // Notify the target client about the new offer
        const targetClientSocket = connectedSockets.find(client => client.userName === targetUserName && client.meetingCode === meetingCode);
        
        if (targetClientSocket) {
            io.to(targetClientSocket.socketId).emit('receiveOffer', { offer, offererUserName: userName });
        } else {
            console.log(`Target user ${targetUserName} not found in meeting ${meetingCode}`);
        }
    
        console.log("New offer sent by " + userName + " to " + targetUserName);
    });
    

    socket.on('newAnswer', async ({ meetingCode, offererUserName, userName, answer }, ackFunction) => {
        // Find the meeting in the database
        console.log("Answer...", userName, offererUserName);
        const meeting = await Meeting.findOne({ meetingCode });
        if (!meeting) {
            console.log("Meeting not found");
            return;
        }
        console.log("Answer", userName, offererUserName);
        // Find the specific offer that needs to be updated with the answer
        const offerToUpdate = meeting.offers.find(o => o.offererUserName === offererUserName);
        if (!offerToUpdate) {
            console.log("No offer found for", offererUserName);
            return;
        }
    
        // Update the offer with the answer and ICE candidates
        offerToUpdate.answer = answer;
        // offerToUpdate.answererIceCandidates = answererIceCandidates;
        offerToUpdate.answererUserName = userName;
    
        // Save the updated meeting with the new answer in MongoDB
        await meeting.save();
        
        // Find the offerer's socket ID
        const socketToAnswer = connectedSockets.find(s => s.userName === offererUserName && s.meetingCode === meetingCode);
        
        if (socketToAnswer) {
            // Emit the answer to the offerer
            io.to(socketToAnswer.socketId).emit('answerResponse', {
                // offererUserName,
                // answererIceCandidates,
                answer,
                answererUserName: userName,
                // offerIceCandidates: offerToUpdate.offerIceCandidates
            });
    
            console.log(`Answer sent from ${userName} to ${offererUserName}`);
        } else {
            console.log(`Offerer ${offererUserName} not found in meeting ${meetingCode}`);
        }
    });

    socket.on('sendIceCandidateToSignalingServer', ({ iceCandidate, targetUserName, meetingCode }) => {
        console.log(`ICE Candidate received from ${socket.id} for ${targetUserName}`);

        // Find the target client in the same meeting
        const targetClient = connectedSockets.find(client => client.userName === targetUserName && client.meetingCode === meetingCode);
        if (targetClient) {
            // Send the ICE candidate to the specific target client
            io.to(targetClient.socketId).emit('receiveIceCandidate', {
                iceCandidate,
                userName: socket.userName  // The user who is sending the ICE candidate
            });
            console.log(`ICE Candidate forwarded to ${targetClient.userName}`);
        }
    });


    socket.on('disconnect', async () => {
        const client = connectedSockets.find(s => s.socketId === socket.id);
        if (client) {
            // Remove client from MongoDB meeting
            const meeting = await Meeting.findOne({ meetingCode: client.meetingCode });
            if (meeting) {
                meeting.clients = meeting.clients.filter(c => c !== client.userName);
                await meeting.save();

                // Notify other clients that the user has left
                socket.broadcast.to(client.meetingCode).emit('clientLeft', { userName: client.userName });
            }

            // Remove from connected clients
            connectedSockets.splice(connectedSockets.indexOf(client), 1);
        }
    });
});