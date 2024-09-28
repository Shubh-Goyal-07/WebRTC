import { io } from 'socket.io-client';

// read config.json
const config = require('./config.json');

// Set the base URL for the API
const baseURL = config.baseURL;

// Create a new socket connection
const socket = io(baseURL, {
    transports: ['websocket'],
});

export default socket;