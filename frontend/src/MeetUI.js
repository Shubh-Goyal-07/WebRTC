import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import WebRTCHandler from './api/WebRTCHandler';

const MeetUI = () => {
    const { meetId, userName } = useParams();
    const localVideo = useRef(null);
    const remoteVideo = useRef(null);
    const socketRef = useRef();

    useEffect(() => {
        // Initialize socket connection
        socketRef.current = io('http://172.31.12.101:8181'); // Adjust the URL as needed

        // Create an instance of WebRTCHandler
        const webrtcHandler = new WebRTCHandler(meetId, userName, socketRef.current, localVideo, remoteVideo);

        // Cleanup function to disconnect the socket when the component unmounts
        return () => {
            socketRef.current.disconnect();
        };
    }, [meetId, userName]);

    return (
        <div>
            <h1>Meeting: {meetId}</h1>
            <video ref={localVideo} autoPlay muted style={{ width: '300px' }} />
            <video ref={remoteVideo} autoPlay style={{ width: '300px' }} />
        </div>
    );
};

export default MeetUI;
