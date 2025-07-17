# Real-Time Video Streaming Web App with WebRTC

This project is a modern, real-time, peer-to-peer (P2P) video and audio streaming application built with Next.js, React, and WebRTC. It allows users to connect in a "room" using a unique ID and engage in a live video call, featuring a dynamic UI and media controls similar to professional video conferencing applications.

---

## Features

- **Real-Time Video & Audio Streaming:** High-quality, low-latency video and audio powered by WebRTC.
- **Room-Based Connectivity:** Users can join calls by sharing a unique room ID.
- **Automatic Connection Flow:** The connection between users is established automatically as soon as two users are in the same room.
- **"Google Meet" Style Dynamic UI:**
    - When a user is alone, their video is centered and large.
    - When a second user joins, the remote video becomes the main view, and the local video shrinks to a Picture-in-Picture (PiP) element at the bottom-right.
- **Modern Toast Notifications:** Non-intrusive, timed notifications for events like "User has joined!" and "The other user has left."
- **Media Controls:** Users can mute/unmute their microphone and turn their camera on/off during a call.

---

## Tech Stack

The project is a monorepo divided into two main parts: a frontend client and a backend signaling server.

#### **Frontend Client (`frontend`)**
- **Framework:** Next.js 14+ (with App Router)
- **Library:** React 18+
- **Language:** TypeScript
- **Real-Time Communication:** Socket.IO Client
- **Styling:** Tailwind CSS

#### **Backend Signaling Server (`server`)**
- **Runtime:** Node.js
- **Framework:** Express.js
- **Real-Time Communication:** Socket.IO Server
- **Language:** JavaScript (with ES Modules)

---

## Getting Started

Follow these instructions to set up and run the project locally on your machine.

### Prerequisites
- Node.js (v18 or later)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd webrtc-project
```

### 2. Set Up and Run the Signaling Server
The signaling server is the backbone that allows users to find each other.

```bash
# Navigate to the server directory
cd signaling-server

# Install dependencies
npm install

# Start the server
npm start
```
The server will be running on `http://localhost:3001`.

### 3. Set Up and Run the Next.js Frontend
In a **new terminal window**, set up the client application.

```bash
# Navigate to the client directory from the root
cd next-app-client

# Install dependencies
npm install

# Create an environment variable file
# Create a new file named .env.local and add the following line:
NEXT_PUBLIC_SOCKET_SERVER_URL=http://localhost:3001

# Start the development server
npm run dev
```
The application will be available at `http://localhost:3000`.

### 4. Test the Application
1. Open `http://localhost:3000` in your first browser tab.
2. Click **"Create a New Room"**. Your browser will ask for camera and microphone permissions. **Allow them.** You should see your video feed.
3. Copy the 4-character Room ID from the top of the screen.
4. Open `http://localhost:3000` in a second browser tab (or an incognito window).
5. Paste the Room ID into the input field and click **"Join"**.
6. The connection will be established automatically, and you should see both video feeds in the "Google Meet" layout in both tabs.
