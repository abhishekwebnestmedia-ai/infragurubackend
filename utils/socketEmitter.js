// utils/socketEmitter.js
exports.emitNotification = (userId, payload) => {
  try {
    if (!global.io) {
      console.warn("⚠️ Socket.IO not initialized — cannot emit notification");
      return;
    }

    const room = `notif_${userId}`;
    global.io.to(room).emit("notification_received", payload);
    console.log(`📩 Notification emitted to ${room}`);
  } catch (err) {
    console.error("❌ emitNotification error:", err);
  }
};
