import { io } from "socket.io-client";

// Connect to the Socket.IO server
const socket = io('http://172.31.93.140:8181', {
    transports: ['websocket'],  // Ensure the WebSocket transport is used
});

export default socket;
