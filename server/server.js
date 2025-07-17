import express from "express";
import http from "http";
import { Server } from "socket.io";
import 'dotenv/config';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ORIGIN,
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("Signaling server is running.");
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  let currentRoomId = null;

  socket.on("join-room", (roomId) => {
    currentRoomId = roomId;
    const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
    const numClients = clientsInRoom ? clientsInRoom.size : 0;

    if (numClients >= 2) {
      socket.emit("room-full");
      return;
    }
    
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    if (numClients === 1) {
      const otherUser = Array.from(clientsInRoom)[0];
      
      socket.emit("peer-present", { peerId: otherUser });
      io.to(otherUser).emit("initiate-call", { peerId: socket.id });
    }
  });

  socket.on("offer", (payload) => io.to(payload.target).emit("offer", payload));
  socket.on("answer", (payload) => io.to(payload.target).emit("answer", payload));
  socket.on("ice-candidate", (payload) => io.to(payload.target).emit("ice-candidate", payload));

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    if (currentRoomId) {
      io.to(currentRoomId).emit("user-disconnected", socket.id);
    }
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Signaling server is running on http://localhost:${PORT}`);
});