// // src/MeetUI.js
// import React, { useEffect, useRef } from 'react';
// import io from 'socket.io-client';
// import WebRTCHandler from './api/WebRTCHandler3';
// import { useParams } from 'react-router-dom';

// const MeetUI = () => {
//     // const socketRef = useRef(null);
//     const { meetId, userName } = useParams();
    
//     useEffect(() => {
//         const webrtcHandler = new WebRTCHandler(meetId, userName);
        
//         const initialize = async () => {
//             await webrtcHandler.initializeMedia();
//             console.log('Media initialized');
//             webrtcHandler.joinMeeting();
//         };
    
//         initialize();
    
//         return () => {
//             // Cleanup WebRTC connections and socket listeners here
//             webrtcHandler.cleanup();
//         };
//     }, [meetId, userName]);
    

//     return (
//         <div id="remoteVideoContainer">
//             <p>Meeting Code: {meetId}</p>
//             <video id="localVideo" autoPlay></video>
//             <video id="peer-video" autoPlay></video>
//             {/* <video id="remoteVideo" autoPlay></video> */}
//         </div>
//     );
// };

// export default MeetUI;


// src/MeetUI.js
import React, { useEffect } from 'react';
import WebRTCHandler from './api/WebRTCHandler4';
import { useParams } from 'react-router-dom';

const MeetUI = () => {
    const { meetId, userName } = useParams();

    useEffect(() => {
        const webrtcHandler = new WebRTCHandler(meetId, userName);
        
        const initialize = async () => {
            try {
                await webrtcHandler.initializeMedia();
                console.log('Media initialized');
                webrtcHandler.joinMeeting();
            } catch (error) {
                console.error('Error initializing media:', error);
            }
        };

        initialize();

        return () => {
            // Clean up WebRTC connections and socket listeners when unmounting
            webrtcHandler.cleanup();
        };
    }, [meetId, userName]);

    return (
        <div id="remoteVideoContainer">
            <p>Meeting Code: {meetId}</p>
            <video id="localVideo" autoPlay playsInline></video>
            <video id="peer-video" autoPlay playsInline></video>
        </div>
    );
};

export default MeetUI;
