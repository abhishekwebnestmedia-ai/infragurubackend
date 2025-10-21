

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

// ----------------------------------------
// ✅ CORS Configuration
// ----------------------------------------
const allowedOrigins = [
 
  'https://crm.infraguru.in',
  'http://localhost:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server or curl
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());
app.use(morgan('dev'));

// ----------------------------------------
// ✅ Routes
// ----------------------------------------
app.use('/api/auth', require('./routes/authroutes'));

// ----------------------------------------
// ✅ Root Route
// ----------------------------------------
app.get('/', (req, res) => {
  res.send('CRM backend server is running 🚀');
});

// ----------------------------------------
// ✅ SOCKET.IO SETUP
// ----------------------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // for now allow all; tighten later
    methods: ["GET", "POST"],
  },
});

app.set("io", io);
global.io = io; // ✅ allows emits from other files (like cron or controllers)

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// ----------------------------------------
// ✅ FOLLOW-UP CRON SERVICE (import AFTER io is ready)
// ----------------------------------------
require("./services/followupCronService");

// ----------------------------------------
// ✅ TEST SOCKET ENDPOINT (for manual verification)
// ----------------------------------------
app.get("/test-socket", (req, res) => {
  if (global.io) {
    console.log("📢 Manual test emit triggered");
    global.io.emit("followup_notification", {
      type: "Test",
      message: "Manual test notification from /test-socket endpoint",
    });
    res.json({ success: true, message: "Test notification emitted" });
  } else {
    res.status(500).json({ success: false, message: "Socket.IO not initialized" });
  }
});

// ----------------------------------------
// ✅ START SERVER
// ----------------------------------------
const PORT = process.env.PORT || 5000;
server
  .listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  })
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${PORT} is in use, trying ${PORT + 1}...`);
      server.listen(PORT + 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });
