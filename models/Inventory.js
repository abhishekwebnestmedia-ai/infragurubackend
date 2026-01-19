const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    propertyCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["flat", "villa", "plot", "commercial", "office", "shop", "other"],
      default: "flat",
    },

    projectName: { type: String, trim: true }, // society/project name
    location: {
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      landmark: { type: String, trim: true },
    },

    unitDetails: {
      bhk: { type: String, trim: true }, // e.g., "2BHK"
      size: { type: Number }, // e.g., 1200
      sizeUnit: { type: String, enum: ["sqft", "sqm"], default: "sqft" },
      floor: { type: Number },
      totalFloors: { type: Number },
      facing: { type: String, trim: true }, // east/west etc.
    },

    pricing: {
      price: { type: Number, required: true },
      currency: { type: String, default: "INR" },
      negotiable: { type: Boolean, default: false },
    },

    status: {
      type: String,
      enum: ["available", "booked", "sold", "hold"],
      default: "available",
    },

    ownerName: { type: String, trim: true },
    ownerPhone: { type: String, trim: true },

    description: { type: String, trim: true },

    images: [{ type: String }], // URLs

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
