

// // Author: Abhi
// const express = require('express');
// const dotenv = require('dotenv');
// const connectDB = require('./config/db');
// const morgan = require('morgan');
// const cors = require('cors');
// const { Server } = require("socket.io");
// const http = require('http');
// const path = require('path');

// // -------------------------
// // Load environment variables
// // -------------------------
// dotenv.config();
// connectDB();

// const app = express();
// console.log('MONGO_URI:', process.env.MONGO_URI);

// // -------------------------
// // CORS configuration (allow only frontend localhost:3000)
// // -------------------------
// app.use(cors({
//   origin: "http://localhost:3001", // only allow this origin
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true // allow cookies/auth headers
// }));

// // -------------------------
// // Core middlewares
// // -------------------------
// app.use(express.json());
// app.use(morgan('dev'));

// // -------------------------
// // Routes
// // -------------------------
// app.use('/api/auth', require('./routes/authroutes'));
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use("/api/groups", require("./routes/grouproute"));
// app.use("/api/broadcasts", require("./routes/broadcastroute"));
// app.use("/api/notifications", require("./routes/notificationRoutes"));
// app.use('/api/lead', require('./routes/leadroute'));
// app.use("/api/projects", require('./routes/projectRoutes'));

// // Root route
// app.get('/', (req, res) => {
//   res.send('CRM backend server is running ');
// });

// // -------------------------
// // HTTP server + Socket.IO
// // -------------------------
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:3001", // only frontend allowed
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true
//   }
// });

// // Attach Socket.IO globally
// app.set("io", io);
// global.io = io;

// // -------------------------
// // Socket.IO events
// // -------------------------
// io.on("connection", (socket) => {
//   console.log(" Socket connected:", socket.id);

//   socket.on("disconnect", () => {
//     console.log(" Socket disconnected:", socket.id);
//   });
// });

// // -------------------------
// // Cron service
// // -------------------------
// require("./services/followupCronService");

// // -------------------------
// // Test socket endpoint
// // -------------------------
// app.get("/test-socket", (req, res) => {
//   if (global.io) {
//     console.log(" Manual test emit triggered");
//     global.io.emit("followup_notification", {
//       type: "Test",
//       message: "Manual test notification from /test-socket endpoint",
//     });
//     return res.json({ success: true, message: "Test notification emitted" });
//   }
//   res.status(500).json({ success: false, message: "Socket.IO not initialized" });
// });

// // -------------------------
// // Start server
// // -------------------------
// const PORT = process.env.PORT || 5001;
// server.listen(PORT, () => {
//   console.log(` Server running on port ${PORT}`);
// }).on('error', (err) => {
//   if (err.code === 'EADDRINUSE') {
//     console.warn(` Port ${PORT} is in use, trying ${PORT + 1}...`);
//     server.listen(PORT + 1);
//   } else {
//     console.error(' Server error:', err);
//   }
// });




// Author: Abhi


// const express = require('express');
// const dotenv = require('dotenv');
// const connectDB = require('./config/db');
// const morgan = require('morgan');
// const cors = require('cors');
// const { Server } = require("socket.io");
// const http = require('http');
// const path = require('path');

// // -------------------------
// // Load environment variables
// // -------------------------
// dotenv.config();
// connectDB();

// const app = express();
// console.log('MONGO_URI:', process.env.MONGO_URI);

// // -------------------------
// // CORS configuration (allow only frontend)
// // -------------------------
// app.use(cors({
//     origin: ["http://localhost:3001", "https://backend.infraguru.in"],

//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true
// }));

// // -------------------------
// // Core middlewares
// // -------------------------
// app.use(express.json());
// app.use(morgan('dev'));

// // -------------------------
// // Routes
// // -------------------------
// app.use('/api/auth', require('./routes/authroutes'));
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use("/api/groups", require("./routes/grouproute"));
// app.use("/api/broadcasts", require("./routes/broadcastroute"));
// app.use("/api/notifications", require("./routes/notificationRoutes"));
// app.use('/api/lead', require('./routes/leadroute'));
// app.use("/api/projects", require('./routes/projectRoutes'));

// // Root route
// app.get('/', (req, res) => {
//   res.send('CRM backend server is running ✅');
// });

// // -------------------------
// // HTTP server + Socket.IO setup
// // -------------------------
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: ["http://localhost:3001", "https://backend.infraguru.in"],

//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   },
// });

// // Attach globally for controllers & services
// app.set("io", io);
// global.io = io;

// // -------------------------
// // SOCKET.IO Logic
// // -------------------------

// // In-memory map for tracking user roles (optional)
// const onlineUsers = new Map();

// io.on("connection", (socket) => {
//   console.log("🟢 Socket connected:", socket.id);

//   // ✅ When frontend connects, register user ID + role
//   // Example (frontend): socket.emit("register_user", { userId, role });
//   socket.on("register_user", ({ userId, role }) => {
//     if (userId) {
//       socket.join(userId); // Join private room for targeted emits
//       onlineUsers.set(userId, { socketId: socket.id, role });
//       console.log(`👤 ${role || "user"} registered socket: ${userId}`);
//     }
//   });

//   socket.on("disconnect", () => {
//     for (let [uid, info] of onlineUsers.entries()) {
//       if (info.socketId === socket.id) {
//         onlineUsers.delete(uid);
//         console.log(`🔴 User disconnected: ${uid}`);
//         break;
//       }
//     }
//   });
// });

// // Make user map globally available (optional)
// global.onlineUsers = onlineUsers;

// // -------------------------
// // Cron Service (Follow-Up Notifications)
// // -------------------------
// require("./services/followupCronService");

// // -------------------------
// // Test Socket Endpoint
// // -------------------------
// app.get("/test-socket", (req, res) => {
//   if (global.io) {
//     console.log("🧪 Manual test emit triggered");
//     global.io.emit("followup_notification", {
//       type: "Test",
//       message: "Manual test notification from /test-socket endpoint",
//     });
//     return res.json({ success: true, message: "Test notification emitted" });
//   }
//   res.status(500).json({ success: false, message: "Socket.IO not initialized" });
// });

// // -------------------------
// // Start Server
// // -------------------------
// const PORT = process.env.PORT || 5001;

// server
//   .listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
//   })
//   .on("error", (err) => {
//     if (err.code === "EADDRINUSE") {
//       console.warn(`⚠️ Port ${PORT} in use, trying ${PORT + 1}...`);
//       server.listen(PORT + 1);
//     } else {
//       console.error("❌ Server error:", err);
//     }
//   });


// Author: Abhi
// Author: Abhi
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const morgan = require('morgan');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');

// ✅ Correct model imports (adjusted file names)
const Broadcast = require('./models/broadcast');
const Group = require('./models/group');

// -------------------------
// Load environment variables
// -------------------------
dotenv.config();
connectDB();

const app = express();
console.log('MONGO_URI:', process.env.MONGO_URI);

// -------------------------
// CORS configuration
// -------------------------
app.use(
  cors({
    origin: ['http://localhost:3001', 'https://infracrm.infraguru.in/login','https://backend.infraguru.in'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// -------------------------
// Core middlewares
// -------------------------
app.use(express.json());
app.use(morgan('dev'));

// -------------------------
// API Routes
// -------------------------
app.use('/api/auth', require('./routes/authroutes'));
app.use('/api/groups', require('./routes/grouproute'));
app.use('/api/broadcasts', require('./routes/broadcastroute'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/lead', require('./routes/leadroute'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('✅ CRM backend server running successfully!');
});

// -------------------------
// HTTP + Socket.IO setup
// -------------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3001', 'https://backend.infraguru.in'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
});

app.set('io', io);
global.io = io;

// -------------------------
// SOCKET.IO Logic
// -------------------------
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id);

  // ✅ Register user
  socket.on('register_user', ({ userId, role }) => {
    if (userId) {
      socket.join(userId);
      onlineUsers.set(userId, { socketId: socket.id, role });
      console.log(`👤 ${role || 'user'} registered with socket: ${userId}`);
    }
  });

  // ✅ Join group
  socket.on('join_group', async ({ groupId }) => {
    if (!groupId) return;
    socket.join(groupId);
    console.log(`👥 User joined group: ${groupId}`);

    try {
      const messages = await Broadcast.find({ group: groupId })
        .populate('createdBy', 'name email')
        .sort({ createdAt: 1 });
      socket.emit('group_messages', { groupId, messages });
    } catch (err) {
      console.error('❌ Error fetching group messages:', err.message);
      socket.emit('group_messages', { groupId, messages: [] });
    }

    socket.emit('joined_group', { success: true, groupId });
  });

  // ✅ Leave group
  socket.on('leave_group', ({ groupId }) => {
    if (groupId) {
      socket.leave(groupId);
      console.log(`🚪 User left group: ${groupId}`);
      socket.emit('left_group', { success: true, groupId });
    }
  });

  // ✅ Send broadcast
  socket.on('send_broadcast', async ({ groupId, message }) => {
    try {
      if (!groupId || !message?.trim()) {
        return socket.emit('broadcast_sent', {
          success: false,
          message: 'Invalid group or message',
        });
      }

      const broadcast = await Broadcast.create({
        group: groupId,
        message,
        createdBy: '69033b33e329c1fdf0728796', // TODO: replace with logged-in user
      });

      console.log(`📢 Broadcast sent to group ${groupId}: ${message}`);

      io.to(groupId).emit('broadcast_received', {
        groupId,
        message,
        createdBy: { name: 'Admin' },
        createdAt: broadcast.createdAt,
      });

      socket.emit('broadcast_sent', { success: true, broadcast });
    } catch (err) {
      console.error('❌ Error sending broadcast:', err.message);
      socket.emit('broadcast_sent', { success: false, error: err.message });
    }
  });

  // ✅ Get group messages
  socket.on('get_group_messages', async ({ groupId }) => {
    try {
      if (!groupId) return;
      const messages = await Broadcast.find({ group: groupId })
        .populate('createdBy', 'name email')
        .sort({ createdAt: 1 });

      console.log(`📥 Sent ${messages.length} messages for group: ${groupId}`);
      socket.emit('group_messages', { groupId, messages });
    } catch (err) {
      console.error('❌ Error fetching messages:', err.message);
      socket.emit('group_messages', { groupId, messages: [] });
    }
  });

  // 🧪 Test event
  socket.on('test_connection', (data) => {
    console.log('🧪 Test from frontend:', data);
    socket.emit('test_response', { success: true, echo: data });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    for (let [uid, info] of onlineUsers.entries()) {
      if (info.socketId === socket.id) {
        onlineUsers.delete(uid);
        console.log(`🔴 User disconnected: ${uid}`);
        break;
      }
    }
  });
});

global.onlineUsers = onlineUsers;

// -------------------------
// Cron Service
// -------------------------
require('./services/followupCronService');

// -------------------------
// Start Server with auto port fallback
// -------------------------
const PORT = process.env.PORT || 5001;

function startServer(port) {
  server
    .listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`🌐 Access it at: https://backend.infraguru.in`);
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ Port ${port} in use, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('❌ Server error:', err);
      }
    });
}

startServer(PORT);
