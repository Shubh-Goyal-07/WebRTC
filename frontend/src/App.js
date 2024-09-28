import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './Home'; // Import Home from a separate file
import Meet from './Meet'; // Import Meet component
import WebSocketClient from './WebSocketClient';
import Meeting from './Meeting';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />  {/* Home page */}
                <Route path="/meet/:meetId" element={<Meet />} />  {/* Meet page */}
                <Route path='/client' element={<WebSocketClient />} />
                <Route path="/meeting/:meetingCode" element={<Meeting />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
