# WebRTC Video Conferencing System

## Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)
- Google Cloud account (for hosting)
- Nodemon

## Installation

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```

## Running the Application Locally

### Start the Backend Server:
1. Navigate to the backend directory and run:
   ```bash
   sudo nodemon server.js
   ```
2. Ensure the backend server is running on the desired port (port 80).

### Start the Frontend Application:
1. Update your system’s IP address in the `frontend/src/api/config.json` file.
2. Open another terminal window, navigate to the frontend directory, and run:
   ```bash
   npm start
   ```
   This will start the React application, which should open in your default web browser at `http://localhost:3000`.

## Hosting on Google Cloud Platform

### To host the backend on Google Cloud Platform (GCP), follow these steps:

#### Create a Google Cloud Project:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.

#### Set Up a Virtual Machine (VM):
1. Navigate to the **Compute Engine** section.
2. Click on **Create Instance**.
3. Choose the desired configuration (OS, machine type, etc.).
4. Ensure that you allow **HTTP** and **HTTPS** traffic.

#### Connect to Your VM:
1. Use SSH to connect to your VM once it's created.

#### Install Node.js on the VM:
1. Update package lists and install Node.js:
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   ```

#### Clone the Repository on the VM:
1. Clone the project from GitHub:
   ```bash
   git clone https://<username>:<personal_access_token>@github.com/Shubh-Goyal-07/WebRTC.git
   ```
2. Navigate to the backend folder:
   ```bash
   cd WebRTC/backend/
   ```
3. Install Project Dependencies:
   ```bash
   npm install
   ```

4. Install nodemon globally:
   ```bash
   sudo npm install -g nodemon
   ```

5. Run the Backend on the VM:
   ```bash
   sudo nodemon server.js
   ```

#### Access the Backend:
- The server will be accessible via the external IP address of the VM. You can view the IP from the Google Cloud Console.
- Update the external IP address in the `frontend/src/api/config.json` file.

## Video Conferencing System Interface
Follow the instructions on the UI to create and join meeting. After creating a meeting, you would get a meeting code which you can share with others for them to join the meeting.
