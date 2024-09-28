// src/Meeting.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import socket from './socket'; // Assuming socket connection setup in socket.js

const Meeting = () => {
    const { meetingCode } = useParams(); // Get parameters from URL
    const [offers, setOffers] = useState([]);
    const userName = "shubh"; // Replace with actual user name

    useEffect(() => {
        // Emit the joinMeeting event
        socket.emit('joinMeeting', { meetingCode, userName });

        // emit offer
        socket.emit('newOffer', { offer: "offer", meetingCode, userName });

        // Listen for available offers
        socket.on('availableOffers', (offers) => {
            setOffers(offers);
        });

        // Listen for when a new client joins the meeting
        socket.on('newClientJoined', ({ userName }) => {
            console.log(`${userName} joined the meeting.`);
        });

        // Clean up the socket listeners on unmount
        return () => {
            socket.off('availableOffers');
            socket.off('newClientJoined');
        };
    }, [meetingCode, userName]);

    return (
        <div>
            <h1>Meeting Code: {meetingCode}</h1>
            <p>Connected as: {userName}</p>

            <div>
                <h2>Available Offers:</h2>
                {offers.length > 0 ? (
                    <ul>
                        {offers.map((offer, index) => (
                            <li key={index}>{offer.offererUserName}</li>
                        ))}
                    </ul>
                ) : (
                    <p>No offers available</p>
                )}
            </div>
        </div>
    );
};

export default Meeting;
