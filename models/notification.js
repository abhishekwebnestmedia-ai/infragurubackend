

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Lead", "Inventory"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    message: { type: String, required: true },
    category: { type: String, enum: ["followUp", "status_change"], required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }, // ✅ Store UTC, convert on display
  },
  { versionKey: false }
);

notificationSchema.index({ type: 1, itemId: 1, message: 1 });

// ✅ Convert createdAt to IST string before sending to client
notificationSchema.methods.toJSON = function () {
  const obj = this.toObject();
  const istOffset = 5.5 * 60 * 60 * 1000;
  
  if (obj.createdAt) {
    // Convert UTC to IST for display
    const istDate = new Date(obj.createdAt.getTime() + istOffset);
    obj.createdAt = istDate
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
  }
  
  return obj;
};

// ✅ Auto-emit real-time notifications after saving
notificationSchema.post("save", async function (doc) {
  try {
    const { emitNotification } = require("../utils/socketEmitter");
    
    // Populate changedBy before emitting
    await doc.populate("changedBy", "name email role");
    
    const userId = doc.changedBy?._id || "admin"; // fallback to admin/global
    emitNotification(userId, doc.toJSON());
    console.log(`📢 Auto-emitted notification for user: ${userId}`);
  } catch (err) {
    console.error("❌ Error auto-emitting notification:", err);
  }
});

// ✅ Auto-populate changedBy on queries
notificationSchema.pre(/^find/, function (next) {
  this.populate("changedBy", "name email role");
  next();
});

module.exports = mongoose.model("Notification", notificationSchema);