// MeetUI.js

import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client'; // Import the socket.io client
import WebRTCHandler from './api/WebRTCHandler';

const MeetUI = () => {
    const { meetId, userName } = useParams();
    const localVideo = useRef(null);
    const remoteVideo = useRef(null);
    const webRTCHandlerRef = useRef(null);

    useEffect(() => {
        const socket = io(); // Initialize your socket connection here

        webRTCHandlerRef.current = new WebRTCHandler(socket, localVideo.current, remoteVideo.current);
        webRTCHandlerRef.current.getMediaStream();

        socket.emit('joinMeeting', { meetingCode: meetId, userName });

        return () => {
            // Cleanup if needed
            socket.disconnect();
        };
    }, [meetId, userName, localVideo, remoteVideo]); // Include localVideo and remoteVideo as dependencies

    return (
        <div>
            <h1>Meeting ID: {meetId}</h1>
            <h2>Welcome, {userName}!</h2>
            <div>
                <video ref={localVideo} autoPlay muted style={{ width: '45%', margin: '10px' }} />
                <video ref={remoteVideo} autoPlay style={{ width: '45%', margin: '10px' }} />
            </div>
        </div>
    );
};

export default MeetUI;
