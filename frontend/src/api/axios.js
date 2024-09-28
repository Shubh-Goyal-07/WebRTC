import axios from 'axios';

const baseURL = 'http://172.31.12.101:8181'; // Replace with your actual base URL

export async function getMeetId() {
    try {
        const response = await axios.post(`${baseURL}/createmeet`, 
                                    {'creator': "shubh"});
        return response.data; // Assuming the response has a field called meetId
    } catch (error) {
        console.error('Error getting meet ID:', error);
        throw error; // Rethrow error to handle it in the calling function
    }
}
