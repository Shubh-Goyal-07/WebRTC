// src/Meeting.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import socket from './api/socket'; // Assuming socket connection setup in socket.js

const Meeting = () => {
    const { meetingCode, userName } = useParams(); // Get parameters from URL
    const [offers, setOffers] = useState([]);
    // Replace with actual user name

    useEffect(() => {
        // 1. Emit the newOffer event
        // 2. Listen for available offers on availableOffers event
        // 2. Listen for available offers on newOfferAwaiting event

        
        
        
        // console.log('Joining meeting:', meetingCode);
        
        socket.emit('newOffer', { offer: "offer", meetingCode, userName });
        
        socket.on('availableOffers', (offers) => {
            setOffers(offers);
            console.log('Received available offers:', offers);
        });

        // console.log('Emitting newOffer');

        // Emit the joinMeeting event
        socket.emit('joinMeeting', { meetingCode, userName });

        socket.on('newOfferAwaiting', (offers) => {
            setOffers(offers);
            console.log('Received available offers:', offers);
        });

        // console.log('Emitting newOffer');

        // emit offer

        // Listen for available offers

        // Listen for when a new client joins the meeting
        // socket.on('newClientJoined', ({ userName }) => {
        //     console.log(`${userName} joined the meeting.`);
        // });

        // Clean up the socket listeners on unmount
        return () => {
            socket.off('availableOffers');
            socket.off('newClientJoined');
        };
    }, [meetingCode, userName, setOffers]);

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
