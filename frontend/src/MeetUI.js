import React, { useEffect, useRef } from 'react';
import WebRTCHandler from './api/WebRTCHandler';
import { io } from 'socket.io-client';

const MeetUI = () => {
    const socketRef = useRef(null);
    const meetingCode = "your-meeting-code"; // Replace with actual meeting code
    const userName = "your-username"; // Replace with actual username

    useEffect(() => {
        // Initialize the socket connection here
        socketRef.current = io.connect('http://172.31.12.101:8181'); // Replace with your actual socket server URL

        const webrtcHandler = new WebRTCHandler(socketRef.current, meetingCode, userName);
        webrtcHandler.initializeMedia();

        // Cleanup function to disconnect the socket when the component unmounts
        return () => {
            socketRef.current.disconnect();
        };
    }, [meetingCode, userName]); // Include dependencies as needed

    return (
        <div>
            <video id="localVideo" autoPlay muted></video>
            <video id="remoteVideo" autoPlay></video>
        </div>
    );
};

export default MeetUI;
