import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMeetId } from './api/axios'; // Import the getMeetId function

const Home = () => {
    const navigate = useNavigate();
    const [meetId, setMeetId] = useState(null);
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

    useEffect(() => {
        if (meetId) {
            navigate(`/meet/${meetId}`); // Navigate to the meet page with the returned meet ID
        }
    }, [meetId, navigate]);

    return (
        <div>
            <h1>Welcome to Instant Meet</h1>
            <button onClick={createMeet}>Create Instant Meet</button>
            {error && <div className='error-message'>{error}</div>}
        </div>
    );
};

export default Home;
