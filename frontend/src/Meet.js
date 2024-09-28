import React from 'react';
import { useParams } from 'react-router-dom';
import WebRTCConference from './WebRTCConference'; // Import WebRTCConference

const Meet = () => {
    const { meetId } = useParams();  // Get meetId from URL

    return (
        <div>
            <h1>Welcome to the Meet</h1>
            <p>Meeting ID: {meetId}</p>
            <WebRTCConference />  {/* Include the WebRTC video conference component */}
        </div>
    );
};

export default Meet;
