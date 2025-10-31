

// Author: Abhi
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const morgan = require('morgan');
const cors = require('cors');
const { Server } = require("socket.io");
const http = require('http');
const path = require('path');

// -------------------------
// Load environment variables
// -------------------------
dotenv.config();
connectDB();

const app = express();
console.log('MONGO_URI:', process.env.MONGO_URI);

// -------------------------
// CORS configuration (allow only frontend localhost:3000)
// -------------------------
app.use(cors({
  origin: "http://localhost:3001", // only allow this origin
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true // allow cookies/auth headers
}));

// -------------------------
// Core middlewares
// -------------------------
app.use(express.json());
app.use(morgan('dev'));

// -------------------------
// Routes
// -------------------------
app.use('/api/auth', require('./routes/authroutes'));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/groups", require("./routes/grouproute"));
app.use("/api/broadcasts", require("./routes/broadcastroute"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use('/api/lead', require('./routes/leadroute'));
app.use("/api/projects", require("./routes/projectRoutes"));

// Root route
app.get('/', (req, res) => {
  res.send('CRM backend server is running ');
});

// -------------------------
// HTTP server + Socket.IO
// -------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001", // only frontend allowed
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
});

// Attach Socket.IO globally
app.set("io", io);
global.io = io;

// -------------------------
// Socket.IO events
// -------------------------
io.on("connection", (socket) => {
  console.log(" Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log(" Socket disconnected:", socket.id);
  });
});

// -------------------------
// Cron service
// -------------------------
require("./services/followupCronService");

// -------------------------
// Test socket endpoint
// -------------------------
app.get("/test-socket", (req, res) => {
  if (global.io) {
    console.log(" Manual test emit triggered");
    global.io.emit("followup_notification", {
      type: "Test",
      message: "Manual test notification from /test-socket endpoint",
    });
    return res.json({ success: true, message: "Test notification emitted" });
  }
  res.status(500).json({ success: false, message: "Socket.IO not initialized" });
});

// -------------------------
// Start server
// -------------------------
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(` Port ${PORT} is in use, trying ${PORT + 1}...`);
    server.listen(PORT + 1);
  } else {
    console.error(' Server error:', err);
  }
});
