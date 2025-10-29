const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const morgan = require('morgan');
const cors = require('cors');
const { Server } = require("socket.io");
const http = require('http');
const path = require('path');

dotenv.config();
connectDB();

const app = express();

console.log('MONGO_URI:', process.env.MONGO_URI);

// --- CORS: allow anyone ---
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

app.use(express.json());
app.use(morgan('dev'));

// --- Routes ---
app.use('/api/auth', require('./routes/authroutes'));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/groups", require("./routes/grouproute"));
app.use("/api/broadcasts", require("./routes/broadcastroute"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use('/api/realtleads', require('./routes/leadroute'));

app.get('/', (req, res) => {
  res.send('CRM backend server is running 🚀');
});

// --- Create HTTP server & Socket.IO ---
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);
global.io = io;

// --- Socket.IO events ---
io.on("connection", (socket) => {
  console.log(" Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log(" Socket disconnected:", socket.id);
  });
});

// --- Cron service ---
require("./services/followupCronService");

// --- Test socket endpoint ---
app.get("/test-socket", (req, res) => {
  if (global.io) {
    console.log(" Manual test emit triggered");
    global.io.emit("followup_notification", {
      type: "Test",
      message: "Manual test notification from /test-socket endpoint",
    });
    res.json({ success: true, message: "Test notification emitted" });
  } else {
    res.status(500).json({ success: false, message: "Socket.IO not initialized" });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(` Port ${PORT} is in use, trying ${PORT + 1}...`);
    server.listen(PORT + 1);
  } else {
    console.error(' Server error:', err);
  }
});
