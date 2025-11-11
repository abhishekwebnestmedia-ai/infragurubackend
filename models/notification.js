

// const mongoose = require("mongoose");

// // ✅ Helper to get IST time
// function getISTDate() {
//   const now = new Date();
//   const istOffset = 5.5 * 60 * 60 * 1000;
//   return new Date(now.getTime() + istOffset);
// }

// const notificationSchema = new mongoose.Schema(
//   {
//     type: {
//       type: String,
//       enum: ["Lead", "Inventory"],
//       required: true,
//     },
//     itemId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//     },
//     message: {
//       type: String,
//       required: true,
//     },
//     changedBy: {
//       type: String, // user name or user ID
//     },
//     createdAt: {
//       type: Date,
//       default: getISTDate,
//     },
//   },
//   { versionKey: false }
// );

// // Always ensure IST time
// notificationSchema.pre("save", function (next) {
//   if (!this.createdAt) this.createdAt = getISTDate();
//   next();
// });

// // Prevent duplicate notifications
// notificationSchema.index({ type: 1, itemId: 1, message: 1 }, { unique: true });

// // Format createdAt before sending to frontend
// notificationSchema.methods.toJSON = function () {
//   const obj = this.toObject();
//   const istOffset = 5.5 * 60 * 60 * 1000;
//   if (obj.createdAt) {
//     obj.createdAt = new Date(obj.createdAt.getTime() + istOffset)
//       .toISOString()
//       .replace("T", " ")
//       .substring(0, 19);
//   }
//   return obj;
// };

// module.exports = mongoose.model("Notification", notificationSchema);




// const mongoose = require("mongoose");

// // ✅ Helper for IST time
// function getISTDate() {
//   const now = new Date();
//   const istOffset = 5.5 * 60 * 60 * 1000;
//   return new Date(now.getTime() + istOffset);
// }

// const notificationSchema = new mongoose.Schema(
//   {
//     type: { type: String, enum: ["Lead", "Inventory"], required: true },
//     itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
//     message: { type: String, required: true },
//     category: { type: String, enum: ["followup", "status_change"], required: true },
//     changedBy: { type: String },
//     createdAt: { type: Date, default: getISTDate },
//   },
//   { versionKey: false }
// );

// notificationSchema.index({ type: 1, itemId: 1, message: 1 }, { unique: true });

// // ✅ Convert createdAt to IST before sending
// notificationSchema.methods.toJSON = function () {
//   const obj = this.toObject();
//   const istOffset = 5.5 * 60 * 60 * 1000;
//   if (obj.createdAt) {
//     obj.createdAt = new Date(obj.createdAt.getTime() + istOffset)
//       .toISOString()
//       .replace("T", " ")
//       .substring(0, 19);
//   }
//   return obj;
// };

// module.exports = mongoose.model("Notification", notificationSchema);




const mongoose = require("mongoose");

// ✅ Helper for IST time
function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset);
}

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Lead", "Inventory"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    message: { type: String, required: true },
    category: { type: String, enum: ["followup", "status_change"], required: true },
    changedBy: { type: String },
    createdAt: { type: Date, default: getISTDate },
  },
  { versionKey: false }
);

notificationSchema.index({ type: 1, itemId: 1, message: 1 }, { unique: true });

// ✅ Convert createdAt to IST before sending
notificationSchema.methods.toJSON = function () {
  const obj = this.toObject();
  const istOffset = 5.5 * 60 * 60 * 1000;
  if (obj.createdAt) {
    obj.createdAt = new Date(obj.createdAt.getTime() + istOffset)
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
  }
  return obj;
};

// ✅ Auto-emit real-time notifications after saving
notificationSchema.post("save", function (doc) {
  try {
    const { emitNotification } = require("../utils/socketEmitter");
    const userId = doc.changedBy || "admin"; // fallback to admin/global
    emitNotification(userId, doc.toJSON());
    console.log(`📢 Auto-emitted notification for user: ${userId}`);
  } catch (err) {
    console.error("❌ Error auto-emitting notification:", err);
  }
});

module.exports = mongoose.model("Notification", notificationSchema);

