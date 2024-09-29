// src/MeetUI.js
import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import WebRTCHandler from './api/WebRTCHandler3';
import { useParams } from 'react-router-dom';

const MeetUI = () => {
    // const socketRef = useRef(null);
    const { meetId, userName } = useParams();
    
    // useEffect(() => {
    //     // console.log('MeetUI:', meetId, userName);
    //     const webrtcHandler = new WebRTCHandler(meetId, userName);
    //     webrtcHandler.initializeMedia().then(() => {
    //         console.log('Media initialized');
    //         webrtcHandler.joinMeeting();
    //     });

    //     return () => {
    //         // socketRef.current.disconnect();
    //     };
    // });

    const webrtcHandler = new WebRTCHandler(meetId, userName);
    webrtcHandler.initializeMedia().then(() => {
        console.log('Media initialized');
        webrtcHandler.joinMeeting();
    });

    return (
        <div>
            <p>Meeting Code: {meetId}</p>
            <video id="localVideo" autoPlay muted></video>
            <video id="remoteVideo" autoPlay></video>
        </div>
    );
};

export default MeetUI;
