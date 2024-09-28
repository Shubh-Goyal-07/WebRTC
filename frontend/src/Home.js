import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMeetId } from './api/axios';

const Home = () => {
    const navigate = useNavigate();
    const [meetId, setMeetId] = useState(null);
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState(null);

    const createMeet = () => {
        getMeetId()
            .then((data) => {
                setMeetId(data.meetingCode);
            })
            .catch((err) => {
                console.error('Error creating meet:', err);
                setError('Failed to create meet. Please try again.');
            });
    };

    const joinMeet = (e) => {
        e.preventDefault();
        if (joinCode.trim() === '') {
            setError('Please enter a valid meet code');
        } else {
            navigate(`/meet/${joinCode}`);
        }
    };

    useEffect(() => {
        if (meetId) {
            navigate(`/meet/${meetId}`);
        }
    }, [meetId, navigate]);

    const containerStyle = {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: '#f3f4f6',
    };

    const cardStyle = {
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '2rem',
        width: '100%',
        maxWidth: '28rem',
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <h1 style={{fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '2rem'}}>Instant Meet</h1>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                    <button 
                        onClick={createMeet}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            fontWeight: '600',
                            borderRadius: '0.375rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        Create instant meet
                    </button>

                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <div style={{flexGrow: 1, borderTop: '1px solid #d1d5db'}}></div>
                        <span style={{flexShrink: 0, margin: '0 1rem', color: '#6b7280'}}>or</span>
                        <div style={{flexGrow: 1, borderTop: '1px solid #d1d5db'}}></div>
                    </div>

                    <form onSubmit={joinMeet} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                        <input
                            type="text"
                            placeholder="Enter a code or link"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.5rem 1rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                            }}
                        />
                        <button 
                            type="submit"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: '#10b981',
                                color: 'white',
                                fontWeight: '600',
                                borderRadius: '0.375rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            Join meeting
                        </button>
                    </form>

                    {error && (
                        <div style={{backgroundColor: '#fee2e2', borderRadius: '0.375rem', padding: '1rem', color: '#991b1b'}}>
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Home;