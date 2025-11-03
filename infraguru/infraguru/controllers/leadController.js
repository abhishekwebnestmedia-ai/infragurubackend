

const Lead = require('../models/leadModel');
const LeadHistory = require("../models/leadHistory");
const Notification = require("../models/notification");
const User = require('../models/user');
const mongoose = require("mongoose");

// ✅ Valid Enums (should match model)
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

// ✅ Validators
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => /^\d{7,15}$/.test(phone);

// ✅ Validate Lead Data
function validateLeadData(data, isUpdate = false) {
  if (!isUpdate || data.clientName !== undefined) {
    if (!data.clientName || data.clientName.trim() === '') {
      return "Client name is required";
    }
  }
  if (!isUpdate || data.contactNumber !== undefined) {
    if (!data.contactNumber || !isValidPhone(data.contactNumber)) {
      return "Invalid or missing contact number";
    }
  }
  if (!isUpdate || data.email !== undefined) {
    if (!data.email || !isValidEmail(data.email)) {
      return "Invalid or missing email";
    }
  }
  if (!isUpdate || data.status !== undefined) {
    if (!data.status || !validStatuses.includes(data.status)) {
      return "Invalid or missing status";
    }
  }
  if (data.source && !validSources.includes(data.source)) {
    return "Invalid lead source";
  }
  return null;
}

// ✅ Create Lead
exports.createLead = async (req, res) => {
  try {
    const errorMsg = validateLeadData(req.body);
    if (errorMsg) {
      return res.status(400).json({ success: false, message: errorMsg });
    }

    const lead = new Lead({
      ...req.body,
      capturedBy: req.user?.name || req.body.capturedBy || "System",
    });

    await lead.save();
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    console.error("❌ createLead error:", err);
    res.status(500).json({ success: false, message: "Server error creating lead" });
  }
};

// ✅ Get All Leads (filtered by role)
exports.getLeads = async (req, res) => {
  try {
    if (!req.user || !req.user.name) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    const userRole = req.user.role || "user";
    const userName = req.user.name;
    let filter = {};

    // Non-admins only see their transferred leads
    if (userRole !== "admin") {
      filter = { transferTo: userName };
    }

    const leads = await Lead.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      role: userRole,
      count: leads.length,
      data: leads,
    });
  } catch (err) {
    console.error("❌ getLeads error:", err);
    res.status(500).json({ success: false, message: "Server error fetching leads" });
  }
};

// ✅ Update Lead
exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const oldLead = await Lead.findById(id);
    if (!oldLead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true });

    // ✅ Track important field changes
    const trackedFields = [
      "status",
      "assignedTo",
      "transferTo",
      "capturedBy",
      "remark",
      "followUp"
    ];

    const changedBy = req.user?.name || "System";

    for (const field of trackedFields) {
      const oldValue = oldLead[field] || "";
      const newValue = updatedLead[field] || "";

      if (String(oldValue) !== String(newValue)) {
        // History log
        await LeadHistory.create({
          leadId: id,
          changedBy,
          field,
          oldValue,
          newValue,
        });

        // Notification
        try {
          const msg = `🔄 Lead "${oldLead.clientName}" ${field} changed from "${oldValue || "N/A"}" → "${newValue || "N/A"}" by ${changedBy}`;
          await Notification.create({
            type: "Lead",
            itemId: id,
            message: msg,
            changedBy,
          });

          if (global.io) {
            global.io.emit("lead_update_notification", {
              type: "Lead",
              leadId: id,
              message: msg,
              changedBy,
            });
          }
        } catch (notifErr) {
          console.warn("⚠️ Notification creation failed:", notifErr.message);
        }
      }
    }

    res.json({ success: true, message: "Lead updated successfully", data: updatedLead });
  } catch (err) {
    console.error("❌ updateLead error:", err);
    res.status(500).json({ success: false, message: "Error updating lead" });
  }
};

// ✅ Get Lead by ID
exports.getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid lead ID" });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.status(200).json({ success: true, data: lead });
  } catch (err) {
    console.error("❌ getLeadById error:", err);
    res.status(500).json({ success: false, message: "Error fetching lead" });
  }
};

// ✅ Delete Lead
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    res.status(200).json({ success: true, message: "Lead deleted successfully" });
  } catch (err) {
    console.error("❌ deleteLead error:", err);
    res.status(500).json({ success: false, message: "Error deleting lead" });
  }
};

// ✅ Bulk Upload Leads
exports.bulkUploadLeads = async (req, res) => {
  try {
    const { leads } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: "Leads array is required" });
    }

    const validLeads = [];
    for (const lead of leads) {
      const errorMsg = validateLeadData(lead);
      if (errorMsg) {
        return res.status(400).json({ success: false, message: `Validation failed for ${lead.clientName || "Unknown"}: ${errorMsg}` });
      }
      validLeads.push({
        ...lead,
        capturedBy: req.user?.name || lead.capturedBy || "System",
      });
    }

    const insertedLeads = await Lead.insertMany(validLeads);
    res.status(201).json({
      success: true,
      message: "Bulk upload successful",
      insertedCount: insertedLeads.length,
      insertedLeads,
    });
  } catch (err) {
    console.error("❌ bulkUploadLeads error:", err);
    res.status(500).json({ success: false, message: "Error during bulk upload" });
  }
};

// ✅ Get Leads by CapturedBy
exports.getLeadsByCapturedBy = async (req, res) => {
  try {
    const { capturedBy } = req.query;
    if (!capturedBy) {
      return res.status(400).json({ success: false, message: "capturedBy query parameter required" });
    }

    const filter = { capturedBy: { $regex: new RegExp(`^${capturedBy}$`, "i") } };
    const leads = await Lead.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      capturedBy,
      totalLeads: leads.length,
      leads,
    });
  } catch (err) {
    console.error("❌ getLeadsByCapturedBy error:", err);
    res.status(500).json({ success: false, message: "Server error fetching leads by capturedBy" });
  }
};

// ✅ Lead History
exports.getLeadChangeHistory = async (req, res) => {
  try {
    const { leadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({ success: false, message: "Invalid lead ID" });
    }

    const history = await LeadHistory.find({ leadId }).sort({ changedAt: -1 });
    res.status(200).json({ success: true, totalChanges: history.length, data: history });
  } catch (err) {
    console.error("❌ getLeadChangeHistory error:", err);
    res.status(500).json({ success: false, message: "Error fetching lead change history" });
  }
};



exports.getLeadAssigned = async (req, res) => {
  try {
    // 1️⃣ Get all active users (sales or user role)
    const users = await User.find({ role: { $in: ["sales", "user"] } });

    // 2️⃣ Fetch all leads once
    const allLeads = await Lead.find();

    // 3️⃣ Prepare today's date (IST)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const todayStr = istNow.toISOString().slice(0, 10); // YYYY-MM-DD

    // 4️⃣ Process each user
    const results = users.map((user) => {
      const userLeads = allLeads.filter(
        (lead) => lead.transferTo?.toLowerCase() === user.name.toLowerCase()
      );

      // Basic counts
      const totalLeads = userLeads.length;
      const hotLeads = userLeads.filter((l) => l.status === "Hot").length;
      const todayVisits = userLeads.filter(
        (l) => l.followUp && l.followUp.startsWith(todayStr)
      ).length;

      // Status-wise breakdown (for "View More")
      const statusBreakdown = {
        Hot: 0,
        Serious: 0,
        Potential: 0,
        "Not Connected": 0,
        Futuristic: 0,
        "Dead Lead": 0,
        Completed: 0,
      };

      userLeads.forEach((l) => {
        if (statusBreakdown[l.status] !== undefined) {
          statusBreakdown[l.status]++;
        }
      });

      return {
        name: user.name,
        totalLeads,
        hotLeads,
        todayVisits,
        statusBreakdown, // 👈 for "View More"
      };
    });

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("❌ getAllUsersLeadSummary error:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching lead summary",
    });
  }
};





