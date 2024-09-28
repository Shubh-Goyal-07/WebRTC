import React, { useState, useEffect } from 'react';
import socket from './socket'; // Import the socket client

export default function WebSocketClient() {
    const [message, setMessage] = useState('');
    const [receivedMessages, setReceivedMessages] = useState([]);

    useEffect(() => {
        // Listen for 'signal' events from the server
        socket.on('signal', (data) => {
            console.log('Received signal:', data);
            setReceivedMessages(prevMessages => [...prevMessages, `Received: ${data.message}`]);
        });

        // Cleanup the event listener on unmount
        return () => {
            socket.off('signal');
        };
    }, []);

    const sendMessage = () => {
        if (message.trim() !== '') {
            // Emit a 'signal' event to the server
            socket.emit('signal', { message });
            setReceivedMessages(prevMessages => [...prevMessages, `Sent: ${message}`]);
            setMessage('');
        }
    };

    return (
        <div>
            <h2>Socket.IO Signaling Test</h2>
            <div style={{ marginBottom: '10px' }}>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter a message"
                    style={{ width: '300px', marginRight: '10px' }}
                />
                <button onClick={sendMessage}>Send Message</button>
            </div>
            <div>
                <h4>Received Messages</h4>
                <ul>
                    {receivedMessages.map((msg, index) => (
                        <li key={index}>{msg}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
