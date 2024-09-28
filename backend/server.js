const fs = require('fs');
const http = require('http');
const express = require('express');
const app = express();
const socketio = require('socket.io');
const mongoose = require('mongoose');
// const { v4: uuidv4 } = require('uuid');
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

// HTTP setup using mkcert
const key = fs.readFileSync('cert.key');
const cert = fs.readFileSync('cert.crt');
const expressServer = http.createServer(app);

const io = socketio(expressServer, {
    cors: {
        origin: [
            // "*"
            // "http://localhost",
            'http://172.31.98.115',
            'http://172.31.93.140' // if using a phone or another computer
        ],
        methods: ["GET", "POST"]
    }
});

expressServer.listen(8181);

// Connected clients will be stored in memory
const connectedSockets = []; // { username, socketId, meetingCode }

// Handle socket connections
io.on('connection', (socket) => {
//     const { userName, password } = socket.handshake.auth;
    
//     if (password !== "x") {
//         socket.disconnect(true);
//         return;
//     }

    // Meeting creation
    // socket.on('createMeeting', async () => {
    //     const meetingCode = uuidv4(); // Unique meeting code
    //     await Meeting.create({ creator: userName, meetingCode, clients: [] });
    //     socket.emit('meetingCreated', { meetingCode });
    // });

    // Client joining a meeting
    socket.on('joinMeeting', async ({ meetingCode, userName="shubh" }) => {
        const meeting = await Meeting.findOne({ meetingCode, userName });
        if (!meeting) {
            socket.emit('error', 'Meeting not found');
            return;
        }

        // Add client to meeting in MongoDB
        meeting.clients.push(userName);
        await meeting.save();

        // Add socket to connected clients
        connectedSockets.push({
            socketId: socket.id,
            userName,
            meetingCode
        });

        // Send stored offers to the new client
        if (meeting.offers.length) {
            socket.emit('availableOffers', meeting.offers);
        }

        // Notify other clients in the meeting about the new client
        socket.join(meetingCode);
        socket.broadcast.to(meetingCode).emit('newClientJoined', { userName });
    });

    // Client sending a new offer
    socket.on('newOffer', async ({ offer, meetingCode }) => {
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
    });

    // Client sending an answer
    socket.on('newAnswer', async (offerObj, ackFunction) => {
        const meeting = await Meeting.findOne({ meetingCode: offerObj.meetingCode });
        if (!meeting) {
            console.log("Meeting not found");
            return;
        }

        const offerToUpdate = meeting.offers.find(o => o.offererUserName === offerObj.offererUserName);
        if (!offerToUpdate) {
            console.log("No OfferToUpdate");
            return;
        }

        // Send back the collected ICE candidates
        ackFunction(offerToUpdate.offerIceCandidates);

        // Update offer with the answer in the database
        await Meeting.updateOne(
            { meetingCode: offerObj.meetingCode, "offers.offererUserName": offerObj.offererUserName },
            { $set: { "offers.$.answer": offerObj.answer, "offers.$.answererUserName": userName } }
        );

        // Emit the answer to the offerer
        const socketToAnswer = connectedSockets.find(s => s.userName === offerObj.offererUserName && s.meetingCode === offerObj.meetingCode);
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