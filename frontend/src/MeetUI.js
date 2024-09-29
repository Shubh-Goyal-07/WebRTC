// src/MeetUI.js
import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import WebRTCHandler from './api/WebRTCHandler';
import { useParams } from 'react-router-dom';

const MeetUI = () => {
    const socketRef = useRef(null);
    const { meetingCode, userName } = useParams();

    useEffect(() => {
        const webrtcHandler = new WebRTCHandler(meetingCode, userName);
        webrtcHandler.initializeMedia().then(() => {
            console.log('Media initialized');
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, [meetingCode, userName]);

    return (
        <div>
            <p>Meeting Code: {meetingCode}</p>
            <video id="localVideo" autoPlay muted></video>
            <video id="remoteVideo" autoPlay></video>
        </div>
    );
};

export default MeetUI;
