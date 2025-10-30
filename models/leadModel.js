

const mongoose = require('mongoose');

// ✅ Valid Enums
const validStatuses = [
  "Hot",
  "Not Connected",
  "Serious",
  "Potential",
  "Futuristic",
  "Dead Lead",
  "Completed"
];

const validSources = [
  "Meta",
  "Google",
  "Referral",
  "Website",
  "Walk-in",
  "Other"
];

// ✅ Helper to generate IST date-time string in "YYYY-MM-DD HH:mm:ss" format
function getISTDateTime() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 hrs in ms
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().replace('T', ' ').substring(0, 19);
}

const leadSchema = new mongoose.Schema(
  {
    source: { type: String, enum: validSources },
    executiveName: { type: String },
    assignedTo: { type: String },
    transferTo: { type: String },
    capturedBy: { type: String },

    date: {
      type: String,
      default: getISTDateTime,
    },

    followUp: {
      type: String,
      default: getISTDateTime,
    },

    status: {
      type: String,
      enum: validStatuses,
      default: "Not Connected",
    },

    clientName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true },

    budget: { type: String },
    location: { type: String },
    projects: { type: String },
    remark: { type: String },
  },
  { timestamps: true }
);

// ✅ Ensure both dates are set before saving
leadSchema.pre('save', function (next) {
  if (!this.date) this.date = getISTDateTime();
  if (!this.followUp) this.followUp = getISTDateTime();
  next();
});

// ✅ Convert timestamps to IST when sending response
leadSchema.methods.toJSON = function () {
  const obj = this.toObject();
  const istOffset = 5.5 * 60 * 60 * 1000;

  if (obj.createdAt) {
    obj.createdAt = new Date(
      new Date(obj.createdAt).getTime() + istOffset
    )
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);
  }

  if (obj.updatedAt) {
    obj.updatedAt = new Date(
      new Date(obj.updatedAt).getTime() + istOffset
    )
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);
  }

  return obj;
};

module.exports = mongoose.model("Lead", leadSchema);
