
const mongoose = require("mongoose");

// ✅ Helper function for IST timestamp
const getISTDateTime = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in ms
  return new Date(now.getTime() + istOffset);
};
// ✅ Schema Definition
const projectSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    pdfLink: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => !v || /^https?:\/\/.+/.test(v),
        message: "Invalid PDF link format",
      },
    },
    developerName: {
      type: String,
      required: [true, "Developer name is required"],
      trim: true,
    },
    thumbnail: {
      type: String, // Stores file path or URL
      trim: true,
    },
    status: {
      type: String,
      enum: ["Commercial", "Residential"],
      default: "Residential",
      required: true,
    },
    createdAt: {
      type: Date,
      default: getISTDateTime, // ✅ custom IST time
    },
  },
  {
    timestamps: false, // ❌ don't auto-create createdAt/updatedAt
    versionKey: false, // ✅ optional — removes __v
  }
);

// ✅ Optional: Format date automatically when sending response
projectSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.createdAtIST = new Date(obj.createdAt).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  return obj;
};

module.exports = mongoose.model("Project", projectSchema);
