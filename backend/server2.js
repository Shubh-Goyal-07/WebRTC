const fs = require('fs');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const uri = 'mongodb+srv://goyal23:sukriti2002@sde.0wnld.mongodb.net/?retryWrites=true&w=majority&appName=SDE';

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// MongoDB setup
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));

// Meeting schema and model
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

// Function to generate random meeting code
function generateMeetingCode(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let meetingCode = '';
    for (let i = 0; i < length; i++) {
        meetingCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return meetingCode;
}

// Simple route to test the server
app.get('/hello', (req, res) => {
    console.log("Hello World!");
    res.send('Hello World!');
});

// API Route for creating a meeting
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
        const existingMeeting = await Meeting.findOne({ meetingCode });
        if (!existingMeeting) {
            isUnique = true;
        }
    }

    // Create new meeting
    const newMeeting = new Meeting({ creator, meetingCode, clients: [], offers: [] });

    try {
        await newMeeting.save();
        res.status(201).json({ message: "Meeting created successfully", meetingCode });
        console.log('Meeting created successfully');
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
        console.log('Internal server error:', err);
    }
});

// HTTP setup using mkcert
const key = fs.readFileSync('cert.key');
const cert = fs.readFileSync('cert.crt');
const expressServer = http.createServer(app);

const io = socketio(expressServer, {
    cors: {
        origin: [
            'http://172.31.98.115',
            'http://172.31.12.101' // Update this as needed for your devices
        ],
        methods: ["GET", "POST"]
    }
});

expressServer.listen(8181, () => {
    console.log('Server is listening on port 8181');
});

// Connected clients stored in memory
const connectedSockets = [];

// Handle socket connections
io.on('connection', (socket) => {
    console.log("A client has connected");

    // Client joining a meeting
    socket.on('joinMeeting', async ({ meetingCode, userName }) => {
        console.log(`${userName} joining meeting: ${meetingCode}`);
        const meeting = await Meeting.findOne({ meetingCode });

        if (!meeting) {
            socket.emit('error', 'Meeting not found');
            return;
        }

        // Add client to meeting in MongoDB
        meeting.clients.push(userName);
        await meeting.save();

        // Add socket to connected clients
        connectedSockets.push({ socketId: socket.id, userName, meetingCode });

        // Send stored offers to the new client
        if (meeting.offers.length) {
            socket.emit('availableOffers', meeting.offers);
        }

        // Notify other clients in the meeting about the new client
        socket.join(meetingCode);
        socket.broadcast.to(meetingCode).emit('newClientJoined', { userName });
        console.log(`${userName} joined meeting: ${meetingCode}`);
    });

    // Client sending a new offer
    socket.on('newOffer', async ({ offer, meetingCode, userName }) => {
        const newOffer = {
            offererUserName: userName,
            offer,
            offerIceCandidates: [],
            answererUserName: null,
            answer: null,
            answererIceCandidates: []
        };

        // Store the offer in the database
        await Meeting.updateOne(
            { meetingCode },
            { $push: { offers: newOffer } }
        );

        // Broadcast the offer to other clients in the meeting
        socket.broadcast.to(meetingCode).emit('newOfferAwaiting', newOffer);
        console.log("New offer sent by " + userName);
    });

    // Client sending answers for offers
    socket.on('newAnswer', async (offerObjs, ackFunction) => {
        const meeting = await Meeting.findOne({ meetingCode: offerObjs.meetingCode });

        if (!meeting) {
            console.log("Meeting not found");
            return;
        }

        const offerToUpdate = meeting.offers.find(o => o.offererUserName === offerObjs.offererUserName);
        if (!offerToUpdate) {
            console.log("No offer found to update");
            return;
        }

        // Send back the collected ICE candidates
        ackFunction(offerToUpdate.offerIceCandidates);

        // Update offer with the answer in the database
        await Meeting.updateOne(
            { meetingCode: offerObjs.meetingCode, "offers.offererUserName": offerObjs.offererUserName },
            { $set: { "offers.$.answer": offerObjs.answer, "offers.$.answererUserName": offerObjs.answererUserName } }
        );

        // Emit the answer to the offerer
        const socketToAnswer = connectedSockets.find(s => s.userName === offerToUpdate.offererUserName && s.meetingCode === offerObjs.meetingCode);
        if (socketToAnswer) {
            socket.to(socketToAnswer.socketId).emit('answerResponse', offerToUpdate);
        }
    });

    // ICE Candidate Handling
    socket.on('sendIceCandidateToSignalingServer', async ({ didIOffer, iceUserName, iceCandidate, meetingCode }) => {
        const meeting = await Meeting.findOne({ meetingCode });

        if (!meeting) {
            console.log("Meeting not found");
            return;
        }

        if (didIOffer) {
            // Update offerer's ICE candidates
            await Meeting.updateOne(
                { meetingCode, "offers.offererUserName": iceUserName },
                { $push: { "offers.$.offerIceCandidates": iceCandidate } }
            );
        } else {
            // Update answerer's ICE candidates
            await Meeting.updateOne(
                { meetingCode, "offers.answererUserName": iceUserName },
                { $push: { "offers.$.answererIceCandidates": iceCandidate } }
            );
        }

        const offerInOffers = didIOffer
            ? meeting.offers.find(o => o.offererUserName === iceUserName)
            : meeting.offers.find(o => o.answererUserName === iceUserName);

        if (offerInOffers) {
            const targetUser = didIOffer ? offerInOffers.answererUserName : offerInOffers.offererUserName;
            const socketToSendTo = connectedSockets.find(s => s.userName === targetUser && s.meetingCode === meetingCode);

            if (socketToSendTo) {
                socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer', iceCandidate);
            }
        }
    });

    // Client leaving a meeting
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

