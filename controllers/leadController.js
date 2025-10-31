

const Lead = require('../models/leadModel');
const User = require('../models/user');
const mongoose = require("mongoose");
const LeadHistory = require("../models/leadHistory");

// Valid statuses for leads
const validStatuses = [
  "Hot", "Not Connected", "Serious", "Potential", "Futuristic", "Dead Lead", "Completed"
];

// Simple email and phone validators
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => /^\d{7,15}$/.test(phone);

// Resolve a user by ID, name, or email
async function resolveUser(identifier) {
  if (!identifier) return null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const user = await User.findById(identifier);
    if (user) return user;
  }
  return await User.findOne({ $or: [{ name: identifier }, { email: identifier }] });
}

// Validate lead data
function validateLeadData(data, isUpdate = false) {
  if (!isUpdate || data.clientName !== undefined) {
    if (!data.clientName || data.clientName.trim() === '') return "Client Name is required";
  }
  if (!isUpdate || data.contactNumber !== undefined) {
    if (!data.contactNumber || !isValidPhone(data.contactNumber)) return "Invalid or missing Contact Number";
  }
  if (!isUpdate || data.email !== undefined) {
    if (!data.email || !isValidEmail(data.email)) return "Invalid or missing Email";
  }
  if (!isUpdate || data.status !== undefined) {
    if (!data.status || !validStatuses.includes(data.status)) return "Invalid or missing Status";
  }
  return null;
}

// ================= CREATE LEAD =================
exports.createLead = async (req, res) => {
  try {
    const errorMsg = validateLeadData(req.body);
    if (errorMsg) return res.status(400).json({ success: false, message: errorMsg });

    const { assignedTo, transferTo, capturedBy, ...leadData } = req.body;

    const existingLead = await Lead.findOne({
      email: leadData.email,
      contactNumber: leadData.contactNumber
    });
    if (existingLead) return res.status(400).json({ success: false, message: "Lead with same email & contact exists" });

    const assignedUser = await resolveUser(assignedTo);
    const transferUser = await resolveUser(transferTo);
    const capturedUser = await resolveUser(capturedBy);

    const lead = new Lead({
      ...leadData,
      assignedTo: assignedUser?._id || null,
      transferTo: transferUser?._id || null,
      capturedBy: capturedUser?._id || null
    });

    await lead.save();
    const populatedLead = await lead.populate("assignedTo transferTo capturedBy", "name email");
    res.status(201).json({ success: true, data: populatedLead });

  } catch (err) {
    console.error("createLead error:", err);
    res.status(500).json({ success: false, message: "Server error creating lead" });
  }
};

// ================= BULK UPLOAD =================
exports.bulkUploadLeads = async (req, res) => {
  try {
    const leads = req.body.leads;
    if (!Array.isArray(leads) || leads.length === 0)
      return res.status(400).json({ success: false, message: "No leads provided" });

    const createdLeads = [];
    const skippedLeads = [];

    for (const data of leads) {
      const errorMsg = validateLeadData(data);
      if (errorMsg) { skippedLeads.push({ data, reason: errorMsg }); continue; }

      const { assignedTo, transferTo, capturedBy, ...leadData } = data;
      const assignedUser = await resolveUser(assignedTo);
      const transferUser = await resolveUser(transferTo);
      const capturedUser = await resolveUser(capturedBy);

      if ((assignedTo && !assignedUser) || (transferTo && !transferUser) || (capturedBy && !capturedUser)) {
        skippedLeads.push({ data, reason: "Could not resolve user references" });
        continue;
      }

      const newLead = new Lead({
        ...leadData,
        assignedTo: assignedUser?._id || null,
        transferTo: transferUser?._id || null,
        capturedBy: capturedUser?._id || null
      });

      await newLead.save();
      createdLeads.push(await newLead.populate("assignedTo transferTo capturedBy", "name email"));
    }

    res.status(201).json({ success: true, count: createdLeads.length, createdLeads, skippedLeads });

  } catch (err) {
    console.error("bulkUploadLeads error:", err);
    res.status(500).json({ success: false, message: "Error uploading leads" });
  }
};

// ================= GET LEADS =================
// exports.getLeads = async (req, res) => {
//   try {
//     if (!req.user || !req.user._id) return res.status(401).json({ success: false, message: "Unauthorized" });

//     const userRole = req.user.role || "user";
//     let filter = {};

//     if (userRole !== "admin") {
//       filter = { transferTo: req.user._id };
//     }

//     const leads = await Lead.find(filter).sort({ createdAt: -1 }).populate("assignedTo transferTo capturedBy", "name email");
//     res.json({ success: true, role: userRole, count: leads.length, data: leads });

//   } catch (err) {
//     console.error("getLeads error:", err);
//     res.status(500).json({ success: false, message: "Server error fetching leads" });
//   }
// };

exports.getLeads = async (req, res) => {
  try {
    if (!req.user || !req.user._id)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const userRole = req.user.role || "user";
    let filter = {};

    if (userRole !== "admin") {
      filter = {
        $or: [
          { transferTo: req.user._id },
          { assignedTo: req.user._id },
          { capturedBy: req.user._id }
        ]
      };
    }

    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .populate("assignedTo transferTo capturedBy", "name email");

    res.json({
      success: true,
      role: userRole,
      count: leads.length,
      data: leads
    });

  } catch (err) {
    console.error("getLeads error:", err);
    res.status(500).json({ success: false, message: "Server error fetching leads" });
  }
};


// ================= GET LEAD BY ID =================
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate("assignedTo transferTo capturedBy", "name email");
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    res.json({ success: true, data: lead });
  } catch (err) {
    console.error("getLeadById error:", err);
    res.status(500).json({ success: false, message: "Error fetching lead" });
  }
};

// ================= UPDATE LEAD =================
exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    for (const field of ['assignedTo', 'transferTo', 'capturedBy']) {
      if (updateData[field] !== undefined) {
        const user = await resolveUser(updateData[field]);
        if (!user) return res.status(400).json({ success: false, message: `Invalid ${field} user` });
        updateData[field] = user._id;
      }
    }

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true }).populate("assignedTo transferTo capturedBy", "name email");
    res.json({ success: true, message: "Lead updated successfully", data: updatedLead });

  } catch (err) {
    console.error("updateLead error:", err);
    res.status(500).json({ success: false, message: "Error updating lead" });
  }
};

// ================= DELETE LEAD =================
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    res.json({ success: true, message: "Lead deleted successfully" });
  } catch (err) {
    console.error("deleteLead error:", err);
    res.status(500).json({ success: false, message: "Error deleting lead" });
  }
};

// ================= ASSIGN/REASSIGN LEAD =================
exports.assignLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    if (!assignedTo) return res.status(400).json({ success: false, message: "assignedTo is required" });

    const user = await resolveUser(assignedTo);
    if (!user) return res.status(400).json({ success: false, message: "Invalid assignedTo user" });

    const lead = await Lead.findByIdAndUpdate(id, { assignedTo: user._id }, { new: true }).populate("assignedTo transferTo capturedBy", "name email");
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({ success: true, message: "Lead assigned successfully", data: lead });
  } catch (err) {
    console.error("assignLead error:", err);
    res.status(500).json({ success: false, message: "Error assigning lead" });
  }
};

// ================= BULK ASSIGN LEADS =================
exports.bulkAssignLeads = async (req, res) => {
  try {
    const { leadIds, assignedTo } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0 || !assignedTo)
      return res.status(400).json({ success: false, message: "leadIds and assignedTo are required" });

    const user = await resolveUser(assignedTo);
    if (!user) return res.status(400).json({ success: false, message: "Invalid assignedTo user" });

    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { $set: { assignedTo: user._id } }
    );

    res.json({ success: true, message: `${result.modifiedCount} leads assigned successfully` });
  } catch (err) {
    console.error("bulkAssignLeads error:", err);
    res.status(500).json({ success: false, message: "Error bulk assigning leads" });
  }
};

// ================= GET LEADS BY USER =================
exports.getLeadsByUserName = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ success: false, message: "username query param required" });

    const user = await User.findOne({ name: username });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const leads = await Lead.find({ assignedTo: user._id }).populate("assignedTo transferTo capturedBy", "name email");
    res.json({ success: true, count: leads.length, data: leads });
  } catch (err) {
    console.error("getLeadsByUserName error:", err);
    res.status(500).json({ success: false, message: "Error fetching leads" });
  }
};

// ================= GET LEADS BY CAPTURED BY =================
exports.getLeadsByCapturedBy = async (req, res) => {
  try {
    const { capturedBy } = req.query;
    if (!capturedBy) return res.status(400).json({ success: false, message: "capturedBy query param required" });

    const user = await User.findOne({ name: capturedBy });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const leads = await Lead.find({ capturedBy: user._id }).populate("assignedTo transferTo capturedBy", "name email");
    res.json({ success: true, count: leads.length, data: leads });
  } catch (err) {
    console.error("getLeadsByCapturedBy error:", err);
    res.status(500).json({ success: false, message: "Error fetching leads" });
  }
};

// ================= GET LEAD CHANGE HISTORY =================
exports.getLeadChangeHistory = async (req, res) => {
  try {
    const { leadId } = req.params;
    const history = await LeadHistory.find({ leadId }).populate("changedBy", "name email").sort({ createdAt: -1 });
    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    console.error("getLeadChangeHistory error:", err);
    res.status(500).json({ success: false, message: "Error fetching lead history" });
  }
};
