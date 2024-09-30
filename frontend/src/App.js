import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './Home'; // Import Home from a separate file
import MeetUI from './MeetUI';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/meet/:meetId/:userName" element={<MeetUI />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;