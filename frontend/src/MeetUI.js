import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WebRTCHandler from './api/WebRTCHandler3';

const MeetUI = () => {
    const { meetId, userName } = useParams();
    const navigate = useNavigate();

    const [participants, setParticipants] = useState([]);
    const [selectedParticipants, setSelectedParticipants] = useState({});
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [videoStatuses, setVideoStatuses] = useState({});

    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const audioDataArrayRef = useRef(null);
    const animationFrameRef = useRef(null);

    const [webrtcHandler, setWebRTCHandler] = useState(null);

    useEffect(() => {
        const handler = new WebRTCHandler(meetId, userName);

        setWebRTCHandler(handler);

        handler.setParticipantUpdateCallback((clients) => {
            console.log("Updated clients:", clients);
            setParticipants(clients);
            setSelectedParticipants(prevSelected => {
                const newSelected = {...prevSelected};
                clients.forEach(client => {
                    if (!(client in newSelected)) {
                        newSelected[client] = false;
                    }
                });
                return newSelected;
            });
            // Initialize video statuses
            setVideoStatuses(prevStatuses => {
                const newStatuses = {...prevStatuses};
                clients.forEach(client => {
                    if (!(client in newStatuses)) {
                        newStatuses[client] = true; // Assume video is on by default
                    }
                });
                return newStatuses;
            });
        });

        const initialize = async () => {
            await handler.initializeMedia();
            handler.joinMeeting();
            setupAudioMeter(handler.localStream);
        };

        initialize();

        return () => {
            if (handler) handler.cleanup();
            stopAudioMeter();
        };
    }, [meetId, userName]);

    const setupAudioMeter = (stream) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 512;
        const bufferLength = analyser.frequencyBinCount;
        const audioDataArray = new Uint8Array(bufferLength);

        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        audioDataArrayRef.current = audioDataArray;

        const monitorAudio = () => {
            analyser.getByteFrequencyData(audioDataArray);
            const sum = audioDataArray.reduce((a, b) => a + b, 0);
            const average = sum / audioDataArray.length;
            setAudioLevel(average);

            animationFrameRef.current = requestAnimationFrame(monitorAudio);
        };

        monitorAudio();
    };

    const stopAudioMeter = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    };

    const handleToggleMute = () => {
        if (webrtcHandler) {
            webrtcHandler.toggleAudio();
            setIsMuted((prev) => !prev);
        }
    };

    const handleToggleVideo = () => {
        if (webrtcHandler) {
            webrtcHandler.toggleVideo();
            setIsVideoOff((prev) => !prev);
        }
    };

    const handleLeaveMeeting = () => {
        if (webrtcHandler) {
            webrtcHandler.handleLeaveMeeting();
        }
        navigate('/');
    };

    const handleSelectParticipant = (participant) => {
        setSelectedParticipants((prevSelected) => ({
            ...prevSelected,
            [participant]: !prevSelected[participant],
        }));

        webrtcHandler.updateSelectedStreams(selectedParticipants)
    };

    const updateVideoStatus = (participantName, isVideoOn) => {
        setVideoStatuses(prevStatuses => ({
            ...prevStatuses,
            [participantName]: isVideoOn
        }));
    };

    return (
        <div style={styles.container}>
            <div style={styles.videoGrid}>
                <div style={styles.videoWrapper}>
                    <video id="localVideo" autoPlay muted style={styles.video}></video>
                    <div style={styles.audioMeter}>
                        <div
                            style={{
                                ...styles.audioLevelBar,
                                height: `${Math.min(audioLevel, 100)}%`,
                                backgroundColor: audioLevel < 60 ? 'green' : 'red',
                            }}
                        />
                    </div>
                    <div style={{...styles.nameTag, backgroundColor: isVideoOff ? 'red' : 'green'}}>
                        {userName} (You)
                    </div>
                </div>
                {participants.filter(p => p !== userName).map((participant) => (
                    <div key={participant} style={{
                        ...styles.videoWrapper,
                        borderColor: videoStatuses[participant] ? 'green' : 'red'
                    }}>
                        <video
                            id={`remoteVideo_${participant}`}
                            autoPlay
                            playsInline
                            style={styles.video}
                            onLoadedMetadata={() => updateVideoStatus(participant, true)}
                        ></video>
                        <div style={{...styles.nameTag, backgroundColor: videoStatuses[participant] ? 'green' : 'red'}}>
                            {participant}
                        </div>
                    </div>
                ))}
            </div>

            <div style={styles.participantsContainer}>
                <h3>Participants</h3>
                {participants.length === 0 ? (
                    <p>No participants yet</p>
                ) : (
                    <ul style={styles.participantList}>
                        {participants.map((participant) => (
                            <li key={participant} style={styles.participantItem}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={!!selectedParticipants[participant]}
                                        onChange={() => handleSelectParticipant(participant)}
                                    />
                                    {participant}
                                </label>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div style={styles.controlBar}>
                <div style={styles.leftControls}>
                    <button
                        onClick={handleToggleMute}
                        style={{
                            ...styles.primaryButton,
                            backgroundColor: isMuted ? '#ef4444' : '#2563eb',
                        }}
                    >
                        {isMuted ? 'Unmute' : 'Mute'}
                    </button>

                    <button
                        onClick={handleToggleVideo}
                        style={{
                            ...styles.primaryButton,
                            backgroundColor: isVideoOff ? '#ef4444' : '#2563eb',
                        }}
                    >
                        {isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
                    </button>
                </div>

                <div style={styles.centerControls}>
                    <button onClick={handleLeaveMeeting} style={styles.leaveButton}>
                        Leave Meeting
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    videoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '10px',
        padding: '10px',
        height: 'calc(100% - 150px)', // Adjust based on your controlBar height
        overflow: 'auto',
    },
    videoWrapper: {
        position: 'relative',
        aspectRatio: '16 / 9',
        border: '3px solid',
        borderRadius: '8px',
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    audioMeter: {
        position: 'absolute',
        right: '8px',
        bottom: '8px',
        width: '8px',
        height: '70px',
        backgroundColor: '#d1d5db',
        borderRadius: '5px',
        overflow: 'hidden',
    },
    audioLevelBar: {
        width: '100%',
        transition: 'height 0.08s ease-in-out',
        position: 'absolute',
        bottom: 0,
    },
    nameTag: {
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        padding: '4px 8px',
        borderRadius: '4px',
        color: 'white',
        fontSize: '12px',
    },
    participantsContainer: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        width: '200px',
        padding: '10px',
        backgroundColor: '#f9fafb',
        border: '1px solid #d1d5db',
    },
    participantList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
    },
    participantItem: {
        marginBottom: '10px',
    },
    controlBar: {
        padding: '1rem',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #d1d5db',
        display: 'flex',
        justifyContent: 'space-between',
    },
    leftControls: {
        display: 'flex',
        gap: '10px',
    },
    primaryButton: {
        padding: '0.5rem 1rem',
        color: '#ffffff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    leaveButton: {
        padding: '0.5rem 1rem',
        backgroundColor: '#ef4444',
        color: '#ffffff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
};

export default MeetUI;