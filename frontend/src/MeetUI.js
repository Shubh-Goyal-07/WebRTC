// MeetUI.js
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import WebRTCHandler from './api/WebRTCHandler'; // Import the WebRTCHandler

const MeetUI = () => {
    const { meetId, userName } = useParams();
    const localVideo = useRef(null);
    const remoteVideo = useRef(null);
    const [socket, setSocket] = useState(null);

    const socketServerURL = 'http://172.31.12.101:8181'; // Replace with your server URL

    useEffect(() => {
        const newSocket = io(socketServerURL);
        setSocket(newSocket);

        newSocket.emit('joinMeeting', { meetingCode: meetId, userName });

        return () => {
            newSocket.disconnect();
        };
    }, [meetId, userName]);

    useEffect(() => {
        if (socket) {
            new WebRTCHandler(meetId, userName, socket, localVideo, remoteVideo);
        }
    }, [socket, meetId, userName]);

    return (
        <div>
            <h1>Meeting: {meetId}</h1>
            <video ref={localVideo} autoPlay muted style={{ width: '300px' }} />
            <video ref={remoteVideo} autoPlay style={{ width: '300px' }} />
        </div>
    );
};

export default MeetUI;
