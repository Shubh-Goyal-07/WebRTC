import React, { useEffect, useRef, useState } from 'react';
import WebRTCHandler from './api/WebRTCHandler';
import { useParams } from 'react-router-dom';

const MeetUI = () => {
    const { meetId, userName } = useParams(); // Extract meetId and userName from URL parameters
    const [localStream, setLocalStream] = useState(null); // State to store the local media stream
    const remoteVideoContainerRef = useRef(); // Ref for the remote video container

    // Function to set up local media (camera and microphone)
    const setupLocalStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream); // Set local media stream in state
            const localVideoElement = document.getElementById('localVideo');
            if (localVideoElement) {
                localVideoElement.srcObject = stream; // Attach local stream to local video element
            }
        } catch (err) {
            console.error('Failed to get media devices:', err);
        }
    };

    // Function to add a remote video stream
    const addRemoteStream = (stream, remoteUserName) => {
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream; // Attach remote stream
        videoElement.autoPlay = true; // Automatically play video
        videoElement.playsInline = true; // Play inline on mobile devices
        videoElement.style.width = '300px'; // Set video width
        videoElement.style.border = '2px solid black'; // Border for clarity
        videoElement.setAttribute('id', remoteUserName); // Set ID for remote user

        // Append video element to the remote video container
        remoteVideoContainerRef.current.appendChild(videoElement);
    };

    // useEffect to set up the local video stream on component mount
    useEffect(() => {
        setupLocalStream();
    }, []);

    // useEffect to initialize the WebRTC connection once local stream is ready
    useEffect(() => {
        if (localStream) {
            const rtcHandler = new WebRTCHandler(meetId, userName, localStream, remoteVideoContainerRef.current);

            // Listen for remote streams from the WebRTC handler
            rtcHandler.onRemoteStream = (stream, remoteUserName) => {
                addRemoteStream(stream, remoteUserName); // Call function to add remote stream
            };
        }
    }, [localStream, meetId, userName]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
            <h2>Meeting ID: {meetId}</h2>
            <video
                id="localVideo"
                autoPlay
                muted
                playsInline
                style={{ width: '300px', border: '2px solid black', marginBottom: '10px' }}
            ></video>

            <div
                ref={remoteVideoContainerRef} // Reference for appending remote video elements
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    justifyContent: 'center',
                    marginTop: '10px',
                    width: '100%',
                }}
            >
                {/* Remote video elements will be appended here */}
            </div>
        </div>
    );
};

export default MeetUI;
