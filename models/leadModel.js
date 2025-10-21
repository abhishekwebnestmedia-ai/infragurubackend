

const mongoose = require('mongoose');

// Valid enums
const validStatuses = [
  "Hot",
  "Not Connected",
  "Serious",
  "Potential",
  "Futuristic",
  "Dead Lead",
  "Completed"
];

const validLeadTypes = [
  "Buyer",
  "Rental"
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
    customerName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true },

    status: {
      type: String,
      required: true,
      enum: validStatuses,
    },

    leadType: {
      type: String,
      required: true,
      enum: validLeadTypes,
    },

    followUp: {
      type: String,
      default: getISTDateTime, // Auto-set IST time if not provided
    },

    requirement: { type: String },
    remark: { type: String },

    date: {
      type: String,
      default: getISTDateTime, // Auto-set IST date when created
    },

    capturedBy: { type: String },
    assignTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    transferTo: { type: String },
    source: { type: String },
    Budget: { type: String },
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
