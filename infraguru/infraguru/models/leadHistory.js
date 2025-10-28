const mongoose = require('mongoose');

const leadHistorySchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead",
    required: true
  },
  changedBy: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String },
    email: { type: String },
  },
  field: { type: String, required: true },
  oldValue: { type: String },
  newValue: { type: String },
  changedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("LeadHistory", leadHistorySchema);
