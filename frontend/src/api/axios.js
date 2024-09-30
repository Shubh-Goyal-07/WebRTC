import axios from 'axios';

// read config.json
const config = require('./config.json');
// Set the base URL for the API
const baseURL = config.baseURL;

export async function getMeetId(creator) {
    try {
        const response = await axios.post(`${baseURL}/createmeet`, 
                                    {'creator': creator});
        return response.data; // Assuming the response has a field called meetId
    } catch (error) {
        console.error('Error getting meet ID:', error);
        throw error; // Rethrow error to handle it in the calling function
    }
}
