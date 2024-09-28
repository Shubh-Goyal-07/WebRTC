const fs = require('fs');
const http = require('http');
const express = require('express');
const app = express();
const socketio = require('socket.io');
const mongoose = require('mongoose');

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
        offerIceCandidates: [Object],
        answererUserName: String,
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
// const key = fs.readFileSync('cert.key');
// const cert = fs.readFileSync('cert.crt');
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

    socket.on('newOffer', async ({ iceCandidates, meetingCode, userName }) => {
        const newOffer = {
            offererUserName: userName,
            offerIceCandidates: iceCandidates, // Include ICE candidates in the offer
            answererUserName: null,
            answererIceCandidates: []
        };
        
        // Add socket to connected clients
        connectedSockets.push({
            socketId: socket.id,
            userName,
            meetingCode
        });

        // Fetch available offers from the database to send to the new client
        const meeting = await Meeting.findOne({ meetingCode });
        if (meeting) {
            const availableOffers = meeting.offers;
            socket.emit('availableOffers', availableOffers);
        }

        // Store the offer in the database
        await Meeting.updateOne(
            { meetingCode },
            { $push: { offers: newOffer } }
        );

        console.log("New offer sent by " + userName);
    });


    socket.on('newAnswer', async (offerObjs, ackFunction) => {
        const meeting = await Meeting.findOne({ meetingCode: offerObjs[0].meetingCode });
        if (!meeting) {
            console.log("Meeting not found");
            return;
        }
    
        const answersToEmit = []; // Array to hold all answers to emit
    
        // Loop through each offerObj to handle multiple answers
        for (const offerObj of offerObjs) {
            const offerToUpdate = meeting.offers.find(o => o.offererUserName === offerObj.offererUserName);
            if (!offerToUpdate) {
                console.log("No OfferToUpdate for", offerObj.offererUserName);
                continue; // Skip if no offer found
            }
    
            // Send back the collected ICE candidates
            ackFunction(offerToUpdate.offerIceCandidates);
    
            // Prepare the answer object to emit
            answersToEmit.push({
                offererUserName: offerObj.offererUserName,
                offerIceCandidates: offerToUpdate.offerIceCandidates,
                // answer: offerObj.answer,
                answererUserName: offerObj.answererUserName, // Directly access from offerObj
                answererIceCandidates: offerToUpdate.answererIceCandidates
            });
        }
    
        // Emit all answers at once to the respective offerers
        answersToEmit.forEach(answer => {
            const socketToAnswer = connectedSockets.find(s => s.userName === answer.offererUserName && s.meetingCode === offerObjs[0].meetingCode);
            if (socketToAnswer) {
                // Emit the collected answers to the offerer
                socket.to(socketToAnswer.socketId).emit('answerResponse', answer);
            }
        });
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