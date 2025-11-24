

// Author: Abhi
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const morgan = require('morgan');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');

// ✅ Models
const Broadcast = require('./models/broadcast');
const Group = require('./models/group');

// ✅ Load environment variables and connect DB
dotenv.config();
connectDB();

const app = express();
console.log('🔗 MONGO_URI:', process.env.MONGO_URI);

// -------------------------
// ✅ CORS Configuration
// -------------------------
const allowedOrigins = [
  'http://localhost:3001',
  'https://infracrm.infraguru.in',
  'https://backend.infraguru.in',
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// -------------------------
// ✅ Core Middlewares
// -------------------------
app.use(express.json());
app.use(morgan('dev'));

// -------------------------
// ✅ API Routes
// -------------------------
app.use('/api/auth', require('./routes/authroutes'));
app.use('/api/groups', require('./routes/grouproute'));
app.use('/api/broadcasts', require('./routes/broadcastroute'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/lead', require('./routes/leadroute'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root Route
app.get('/', (req, res) => {
  res.send('✅ CRM backend server running successfully!');
});

// -------------------------
// ✅ HTTP + Socket.IO Setup
// -------------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
});

app.set('io', io);
global.io = io;

// -------------------------
// ✅ SOCKET.IO Logic
// -------------------------
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🟢 Socket connected: ${socket.id}`);

  // ✅ Register user (accepts string or object)
  socket.on('register_user', (data) => {
    let userId = null;
    let role = null;

    if (typeof data === 'string') {
      userId = data;
    } else if (data && typeof data === 'object') {
      userId = data.userId || data._id || data.id;
      role = data.role || 'user';
    }

    if (!userId) {
      console.warn('⚠️ register_user called without valid userId:', data);
      return;
    }

    socket.join(`notif_${userId}`);
    onlineUsers.set(userId, { socketId: socket.id, role });
    console.log(`👤 ${role} registered & joined room notif_${userId}`);

    socket.emit('registered_success', { message: `Joined notif_${userId}` });
  });

  // ✅ Explicit notification subscription
  socket.on('subscribe_notifications', (data) => {
    let userId = null;
    if (typeof data === 'string') userId = data;
    else if (data && typeof data === 'object') userId = data.userId || data._id || data.id;

    if (!userId) {
      console.warn('⚠️ subscribe_notifications called without valid userId:', data);
      return;
    }

    socket.join(`notif_${userId}`);
    console.log(`🔔 Socket subscribed to notif_${userId}`);
  });

  // ✅ Join group for broadcasts
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

  // ✅ Fetch group messages
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

  // ✅ Test connection
  socket.on('test_connection', (data) => {
    console.log('🧪 Test from frontend:', data);
    socket.emit('test_response', { success: true, echo: data });
  });

  // ✅ Handle disconnects
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
// ✅ Cron Service
// -------------------------
// require('./services/followupCronService');
const initializeFollowUpCron = require('./services/followupCronService');
initializeFollowUpCron();

// -------------------------
// ✅ Start Server with Auto Port Fallback
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


