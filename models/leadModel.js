

const mongoose = require('mongoose');

const validStatuses = [
   
      "Follow Ups",
      "Not Connected",
      "Prospect",
      "Closer",
];

const validSources = ["Meta", "Google", "Referral", "Website", "Walk-in", "Other"];

// ✅ Helper to generate IST date
function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 hrs
  return new Date(now.getTime() + istOffset);
}

const leadSchema = new mongoose.Schema({
  source: { type: String, enum: validSources },
  executiveName: { type: String },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  transferTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  capturedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

  date: { type: Date, default: getISTDate },
  followUp: { type: Date, default: getISTDate },

  status: { type: String, enum: validStatuses, default: "Not Connected" },
  clientName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  budget: { type: String },
  location: { type: String },
  projects: { type: String },
  remark: { type: String }
}, { timestamps: true });

// Auto-populate user references
leadSchema.pre(/^find/, function (next) {
  this.populate("assignedTo transferTo capturedBy", "name email");
  next();
});

// Convert timestamps to IST string in JSON
leadSchema.methods.toJSON = function () {
  const obj = this.toObject();
  const istOffset = 5.5 * 60 * 60 * 1000;

  ['createdAt', 'updatedAt', 'date', 'followUp'].forEach(field => {
    if (obj[field]) {
      obj[field] = new Date(new Date(obj[field]).getTime() + istOffset)
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19);
    }
  });

  return obj;
};

module.exports = mongoose.model("Lead", leadSchema);
