import React, { useRef, useState } from 'react';

const WebRTCConference = () => {
    const localVideoRef = useRef(null);
    const [remoteStreams, setRemoteStreams] = useState([]);  // Array to store all remote streams
    const [peerConnections, setPeerConnections] = useState({});
    const [localStream, setLocalStream] = useState(null);

    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            // Add a TURN server here if needed for production
        ]
    };

    const startCall = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(configuration);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = event => {
            if (event.candidate) {
                // Send the candidate to the signaling server for others
                sendSignal({ type: 'candidate', candidate: event.candidate });
            }
        };

        pc.ontrack = event => {
            const [newStream] = event.streams;
            setRemoteStreams(prev => {
                // Add the new stream if it’s not already in the list
                if (!prev.find(s => s.id === newStream.id)) {
                    return [...prev, newStream];
                }
                return prev;
            });
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: 'offer', offer });

        setPeerConnections({ [pc.connectionState]: pc });
    };

    const shareScreen = async () => {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenVideo = document.createElement('video');
        screenVideo.srcObject = screenStream;
        screenVideo.autoplay = true;
        document.body.appendChild(screenVideo);

        screenStream.getTracks()[0].onended = () => screenVideo.remove();  // Stop screen share
        screenStream.getTracks().forEach(track => peerConnections.addTrack(track, screenStream));
    };

    const endCall = () => {
        Object.values(peerConnections).forEach(pc => pc.close());
        localStream.getTracks().forEach(track => track.stop());
        setRemoteStreams([]);
    };

    const sendSignal = (signal) => {
        // Implement your signaling logic here (e.g., WebSocket or Server-Sent Events)
        console.log('Sending signal:', signal);
    };

    const handleSignal = (signal) => {
        if (signal.type === 'offer') {
            handleOffer(signal.offer);
        } else if (signal.type === 'answer') {
            handleAnswer(signal.answer);
        } else if (signal.type === 'candidate') {
            handleCandidate(signal.candidate);
        }
    };

    const handleOffer = async (offer) => {
        const pc = new RTCPeerConnection(configuration);
        setPeerConnections(prev => ({ ...prev, [pc.connectionState]: pc }));

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        pc.ontrack = event => {
            const [newStream] = event.streams;
            setRemoteStreams(prev => {
                if (!prev.find(s => s.id === newStream.id)) {
                    return [...prev, newStream];
                }
                return prev;
            });
        };

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: 'answer', answer });

        pc.onicecandidate = event => {
            if (event.candidate) {
                sendSignal({ type: 'candidate', candidate: event.candidate });
            }
        };
    };

    const handleAnswer = async (answer) => {
        const pc = peerConnections[Object.keys(peerConnections)[0]]; // Get the peer connection
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleCandidate = async (candidate) => {
        const pc = peerConnections[Object.keys(peerConnections)[0]]; // Get the peer connection
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    };

    return (
        <div>
            <h1>WebRTC Video Conference</h1>
            <video ref={localVideoRef} autoPlay muted style={{ width: '300px', border: '1px solid black' }}></video>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '10px' }}>
                {remoteStreams.map((stream, index) => (
                    <video key={index} autoPlay playsInline
                        ref={video => { if (video) video.srcObject = stream; }}
                        style={{ width: '300px', border: '1px solid black', margin: '10px' }}>
                    </video>
                ))}
            </div>
            <div>
                <button onClick={startCall}>Start Call</button>
                <button onClick={shareScreen}>Share Screen</button>
                <button onClick={endCall}>End Call</button>
            </div>
        </div>
    );
};

export default WebRTCConference;
