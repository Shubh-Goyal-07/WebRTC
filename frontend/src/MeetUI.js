// src/MeetUI.js
import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import WebRTCHandler from './api/WebRTCHandler3';
import { useParams } from 'react-router-dom';

const MeetUI = () => {
    // const socketRef = useRef(null);
    const { meetId, userName } = useParams();
    
    useEffect(() => {
        const webrtcHandler = new WebRTCHandler(meetId, userName);
        
        const initialize = async () => {
            await webrtcHandler.initializeMedia();
            console.log('Media initialized');
            webrtcHandler.joinMeeting();
        };
    
        initialize();
    
        return () => {
            // Cleanup WebRTC connections and socket listeners here
            webrtcHandler.cleanup();
        };
    }, [meetId, userName]);
    

    return (
        <div id="remoteVideoContainer">
            <p>Meeting Code: {meetId}</p>
            <video id="localVideo" autoPlay muted></video>
            {/* <video id="remoteVideo" autoPlay></video> */}
        </div>
    );
};

export default MeetUI;
