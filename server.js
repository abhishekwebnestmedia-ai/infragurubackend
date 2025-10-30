// Author: Abhishek

const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const morgan = require("morgan");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const path = require("path");

// -------------------------
// Load environment variables
// -------------------------
dotenv.config();
console.log("Environment loaded. MONGO_URI:", process.env.MONGO_URI);

// -------------------------
// Connect to MongoDB
// -------------------------
connectDB();

// -------------------------
// Initialize Express app
// -------------------------
const app = express();

// -------------------------
// ✅ CORS Configuration (no errors anymore)
// -------------------------
// Allow all origins and handle preflight OPTIONS requests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // Handle preflight
  }
  next();
});

// -------------------------
// Core Middlewares
// -------------------------
app.use(express.json());
app.use(morgan("dev"));

// -------------------------
// Routes
// -------------------------
app.use("/api/auth", require("./routes/authroutes"));
app.use("/api/groups", require("./routes/grouproute"));
app.use("/api/broadcasts", require("./routes/broadcastroute"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/realtleads", require("./routes/leadroute"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Root route
app.get("/", (req, res) => {
  res.send("✅ CRM backend server is running successfully!");
});

// -------------------------
// Create HTTP server
// -------------------------
const server = http.createServer(app);

// -------------------------
// ✅ Initialize Socket.IO with proper CORS
// -------------------------
const io = new Server(server, {
  cors: {
    origin: "*", // allow all origins
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  },
});

// Attach Socket.IO globally
app.set("io", io);
global.io = io;

// -------------------------
// Socket.IO Events
// -------------------------
io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// -------------------------
// Cron Service (for follow-up notifications, etc.)
// -------------------------
require("./services/followupCronService");

// -------------------------
// Test Socket Endpoint
// -------------------------
app.get("/test-socket", (req, res) => {
  if (global.io) {
    console.log("🚀 Manual test emit triggered");
    global.io.emit("followup_notification", {
      type: "Test",
      message: "Manual test notification from /test-socket endpoint",
    });
    return res.json({ success: true, message: "Test notification emitted" });
  }
  res.status(500).json({ success: false, message: "Socket.IO not initialized" });
});

// -------------------------
// Start Server
// -------------------------
const PORT = process.env.PORT || 5001;

server
  .listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️ Port ${PORT} in use, trying ${PORT + 1}`);
      server.listen(PORT + 1);
    } else {
      console.error("❌ Server error:", err);
    }
  });
