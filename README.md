# WebRTC Video Conferencing System

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Google Cloud account (for hosting)
- Basic understanding of WebRTC concepts

## Installation

### Frontend Setup

1. Navigate to the `frontend` directory:

   ```bash
   cd frontend
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

### Backend Setup

1. Navigate to the `backend` directory:

   ```bash
   cd backend
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

## Running the Application Locally

1. **Start the Backend Server:**

   Navigate to the `backend` directory and run:

   ```bash
   node server.js
   ```

   Ensure the backend server is running on the desired port (default is usually 3000).

2. **Start the Frontend Application:**

   Open another terminal window, navigate to the `frontend` directory, and run:

   ```bash
   npm start
   ```

   This will start the React application, which should open in your default web browser at `http://localhost:3000`.

## Hosting on Google Cloud Platform

To host the backend on Google Cloud Platform (GCP), follow these steps:

1. **Create a Google Cloud Project:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project.

2. **Set Up a Virtual Machine (VM):**
   - Navigate to the **Compute Engine** section.
   - Click on **Create Instance**.
   - Choose the desired configuration (OS, machine type, etc.).
   - Ensure that you allow HTTP and HTTPS traffic.

3. **Connect to Your VM:**
   - Use SSH to connect to your VM once it's created.

4. **Install Node.js on the VM:**
   - Update package lists and install Node.js:

     ```bash
     sudo apt update
     sudo apt install nodejs npm
     ```

5. **Clone Your Repository on the VM:**
   - Navigate to the desired directory on your VM and clone your repository:

     ```bash
     git clone <your-repository-url>
     cd <your-repository-folder>/backend
     ```

6. **Install Backend Dependencies:**
   - Run:

     ```bash
     npm install
     ```

7. **Start the Backend Server:**
   - Run your server using:

     ```bash
     node server.js
     ```

8. **Access Your Application:**
   - Ensure your VM's external IP is used to access the backend. You can call the API from your React frontend by replacing localhost with your VM's IP address.

## Usage

1. Open your browser and navigate to `http://localhost:3000` to access the frontend of the application.
2. Follow the on-screen instructions to join or create meetings.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
