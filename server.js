// npm init -y
// npm i socket.io express
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const httpserver = http.createServer(app);

// Serve static frontend files
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client.html"));
});

const io = new Server(httpserver, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let count = 0;
const users = new Map(); // socket.id -> { username, joinedAt }

io.on("connection", (socket) => {
  count++;
  console.log("Active user: ", count);

  // Set default guest name
  const defaultUsername = `User_${socket.id.substring(0, 4).toUpperCase()}`;
  users.set(socket.id, { username: defaultUsername, joinedAt: new Date() });

  // Broadcast updated count to all clients
  io.emit("user_count", count);

  // Original events preserved
  // Sending
  socket.emit("gyankibaat", "welcome to socket.io server");
  socket.broadcast.emit("join", `${defaultUsername} joined the chat`);

  // Announcement event
  io.emit("announcement", "Today is last time we study web dev -3");

  // Handle username update
  socket.on("set_username", (newUsername) => {
    const trimmed = (newUsername || "").trim();
    if (trimmed) {
      const oldName = users.get(socket.id)?.username || "User";
      users.set(socket.id, { username: trimmed, joinedAt: new Date() });
      io.emit("system_message", {
        type: "info",
        text: `"${oldName}" is now known as "${trimmed}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  // Reading 'kuchbhi' event (from original tutorial)
  socket.on("kuchbhi", (msg) => {
    console.log("Received 'kuchbhi':", msg);
    // Broadcast as well so other clients and frontend can display it
    io.emit("kuchbhi_received", {
      from: users.get(socket.id)?.username || "User",
      message: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // Real-time chat messages
  socket.on("chat_message", (data) => {
    const userInfo = users.get(socket.id);
    const username = (data && data.sender) || (userInfo ? userInfo.username : "Anonymous");
    const text = typeof data === "string" ? data : (data?.text || "");

    if (!text.trim()) return;

    const payload = {
      id: Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      socketId: socket.id,
      sender: username,
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    io.emit("chat_message", payload);
  });

  // Typing status indicator
  socket.on("typing", (username) => {
    socket.broadcast.emit("user_typing", username || users.get(socket.id)?.username || "Someone");
  });

  socket.on("stop_typing", () => {
    socket.broadcast.emit("user_stop_typing");
  });

  // Disconnection
  socket.on("disconnect", () => {
    count--;
    const userInfo = users.get(socket.id);
    const username = userInfo ? userInfo.username : "A user";
    users.delete(socket.id);

    console.log("Active user: ", count);
    io.emit("user_count", count);
    socket.broadcast.emit("user_left", `${username} left the chat`);
  });
});

const PORT = process.env.PORT || 8080;
httpserver.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
