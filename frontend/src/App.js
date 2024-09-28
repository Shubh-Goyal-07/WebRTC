import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './Home'; // Import Home from a separate file
// import Meet from './Meet'; // Import Meet component
// import WebSocketClient from './WebSocketClient';
// import Meeting from './Meeting';
import MeetUI from './MeetUI';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/meet/:meetId/:userName" element={<MeetUI />} />
                {/* <Route path="/meet/:meetId" element={<Meet />} />   */}
                {/* <Route path='/client' element={<WebSocketClient />} /> */}
                {/* <Route path="/meeting/:meetingCode/:userName" element={<Meeting />} /> */}
            </Routes>
        </BrowserRouter>
    );
};

export default App;
