const mongoose = require("mongoose");

const broadcastSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    message: { type: String, default: "" },
    attachmentUrl: { type: String, default: null },
    attachmentType: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Broadcast", broadcastSchema);
