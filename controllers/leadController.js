


// const Lead = require('../models/leadModel');
// const User = require('../models/user');
// const mongoose = require("mongoose");
// const LeadHistory = require("../models/leadHistory");
// const Notification = require("../models/notification");

// const validStatuses = [
//   "Hot",
//   "Not Connected",
//   "Serious",
//   "Potential",
//   "Futuristic",
//   "Dead Lead",
//   "Completed"
// ];

// const validLeadTypes = ["Buyer", "Rental"];

// // 🔹 Helpers
// const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// const isValidPhone = (phone) => /^\d{7,15}$/.test(phone);

// // 🔹 Resolve assignTo: accepts ObjectId, name, or email
// async function resolveAssignTo(assignTo) {
//   if (!assignTo) return null;

//   // If it's a valid ObjectId, try by ID first
//   if (mongoose.Types.ObjectId.isValid(assignTo)) {
//     const user = await User.findById(assignTo);
//     if (user) return user;
//   }

//   // Otherwise, search by name or email
//   return await User.findOne({ $or: [{ name: assignTo }, { email: assignTo }] });
// }

// // 🔹 Validate Lead Data
// function validateLeadData(data, isUpdate = false) {
//   if (!isUpdate || data.customerName !== undefined) {
//     if (!data.customerName || data.customerName.trim() === '') {
//       return "Customer Name is required";
//     }
//   }
//   if (!isUpdate || data.contactNumber !== undefined) {
//     if (!data.contactNumber || !isValidPhone(data.contactNumber)) {
//       return "Invalid or missing Contact Number";
//     }
//   }
//   if (!isUpdate || data.email !== undefined) {
//     if (!data.email || !isValidEmail(data.email)) {
//       return "Invalid or missing Email";
//     }
//   }
//   if (!isUpdate || data.status !== undefined) {
//     if (!data.status || !validStatuses.includes(data.status)) {
//       return "Invalid or missing Status";
//     }
//   }
//   if (!isUpdate || data.leadType !== undefined) {
//     if (!data.leadType || !validLeadTypes.includes(data.leadType)) {
//       return "Invalid or missing Lead Type";
//     }
//   }
//   return null;
// }

// // 🔹 Create Lead
// exports.createLead = async (req, res) => {
//   try {
//     const errorMsg = validateLeadData(req.body);
//     if (errorMsg) {
//       return res.status(400).json({ success: false, message: errorMsg });
//     }

//     const { assignTo, ...leadData } = req.body;

//     let user = null;
//     if (assignTo) {
//       user = await resolveAssignTo(assignTo);
//       if (!user) {
//         return res.status(400).json({ success: false, message: "Invalid assignTo user" });
//       }
//     }

//     const lead = new Lead({
//       ...leadData,
//       assignTo: user ? user._id : null,
//     });

//     await lead.save();
//     res.status(201).json({ success: true, data: lead });
//   } catch (err) {
//     console.error(" createLead error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// // 🔹 Assign/Reassign Lead
// exports.assignLead = async (req, res) => {
//   try {
//     const { assignTo } = req.body;
//     if (!assignTo) {
//       return res.status(400).json({ success: false, message: "assignTo field is required" });
//     }

//     const user = await resolveAssignTo(assignTo);
//     if (!user) {
//       return res.status(400).json({ success: false, message: "Invalid assignTo user" });
//     }

//     const lead = await Lead.findByIdAndUpdate(
//       req.params.id,
//       { assignTo: user._id },
//       { new: true }
//     ).populate("assignTo", "name email");

//     if (!lead) {
//       return res.status(404).json({ success: false, message: "Lead not found" });
//     }

//     res.json({ success: true, message: "Lead assigned successfully", data: lead });
//   } catch (err) {
//     console.error(" assignLead error:", err);
//     res.status(500).json({ success: false, message: "Error assigning lead" });
//   }
// };



// exports.getLeads = async (req, res) => {
//   try {
//     // ✅ Step 1 - Ensure the user is authenticated
//     if (!req.user || !req.user.name) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Unauthorized access" });
//     }

//     const userRole = req.user.role || "user";
//     const userName = req.user.name; // 🟢 match by name
//     let filter = {};

//     // ✅ Step 2 - Only filter by `transferTo` for non-admin users
//     if (userRole !== "admin") {
//       filter = { transferTo: userName };
//     }

//     // ✅ Step 3 - Fetch filtered leads
//     const leads = await Lead.find(filter)
//       .populate("assignTo", "name email role")
//       .sort({ createdAt: -1 });

//     // ✅ Step 4 - Respond with results
//     res.status(200).json({
//       success: true,
//       role: userRole,
//       count: leads.length,
//       data: leads,
//     });
//   } catch (err) {
//     console.error("❌ getLeads error:", err.message);
//     res
//       .status(500)
//       .json({ success: false, message: "Server error fetching leads" });
//   }
// };


// exports.updateLead = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updateData = { ...req.body };

//     const oldLead = await Lead.findById(id).populate("assignTo", "name email");
//     if (!oldLead) {
//       return res.status(404).json({ success: false, message: "Lead not found" });
//     }

//     // ✅ If assignTo provided, resolve to user ID
//     if (updateData.assignTo !== undefined) {
//       const user = await resolveAssignTo(updateData.assignTo);
//       if (!user) {
//         return res.status(400).json({ success: false, message: "Invalid assignTo user" });
//       }
//       updateData.assignTo = user._id;
//     }

//     // ✅ Update the lead
//     const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true })
//       .populate("assignTo", "name email");

//     // ✅ Tracked fields
//     const trackedFields = ["status", "assignTo", "capturedBy", "transferTo", "remark", "followUp"];

//     // ✅ Identify who made the change
//     let changedBy = null;
//     if (req.user) {
//       const user = await User.findById(req.user._id).select("name email");
//       if (user) {
//         changedBy = {
//           _id: user._id,
//           name: user.name,
//           email: user.email,
//         };
//       }
//     }

//     // ✅ Loop over tracked fields
//     for (const field of trackedFields) {
//       let oldValue = oldLead[field];
//       let newValue = updatedLead[field];

//       if (field === "assignTo") {
//         oldValue = oldLead.assignTo?.name || "";
//         newValue = updatedLead.assignTo?.name || "";
//       }

//       if (String(oldValue || "") !== String(newValue || "")) {
//         // 🔹 Existing functionality — Create history
//         await LeadHistory.create({
//           leadId: id,
//           changedBy,
//           field,
//           oldValue,
//           newValue,
//         });

//         // 🔹 NEW functionality — Create notifications (safely)
//         try {
//           if (field === "assignTo") {
//             const msg = `👤 Lead "${oldLead.customerName}" was reassigned to ${newValue || "N/A"} by ${changedBy?.name || "System"}`;
//             await Notification.create({
//               type: "Lead",
//               itemId: id,
//               message: msg,
//               changedBy: changedBy?.name || "System",
//             });

//             if (global.io) {
//               global.io.emit("lead_update_notification", {
//                 type: "Lead",
//                 leadId: id,
//                 message: msg,
//                 changedBy: changedBy?.name || "System",
//               });
//             }
//           }

//           if (field === "status") {
//             const msg = `🔄 Lead "${oldLead.customerName}" status changed from ${oldValue || "N/A"} → ${newValue} by ${changedBy?.name || "System"}`;
//             await Notification.create({
//               type: "Lead",
//               itemId: id,
//               message: msg,
//               changedBy: changedBy?.name || "System",
//             });

//             if (global.io) {
//               global.io.emit("lead_update_notification", {
//                 type: "Lead",
//                 leadId: id,
//                 message: msg,
//                 changedBy: changedBy?.name || "System",
//               });
//             }
//           }
//         } catch (notifErr) {
//           console.warn("⚠️ Notification creation failed (lead):", notifErr.message);
//         }
//       }
//     }

//     res.json({ success: true, message: "Lead updated successfully", data: updatedLead });
//   } catch (err) {
//     console.error("updateLead error:", err);
//     res.status(500).json({ success: false, message: "Error updating lead" });
//   }
// };


// // 🔹 Get Lead by ID
// exports.getLeadById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Validate ID
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ success: false, message: "Invalid lead ID" });
//     }

//     const lead = await Lead.findById(id).populate("assignTo", "name email");

//     if (!lead) {
//       return res.status(404).json({ success: false, message: "Lead not found" });
//     }

//     res.json({ success: true, data: lead });
//   } catch (err) {
//     console.error(" getLeadById error:", err);
//     res.status(500).json({ success: false, message: "Error fetching lead" });
//   }
// };


// // 🔹 Delete Lead
// exports.deleteLead = async (req, res) => {
//   try {
//     const lead = await Lead.findByIdAndDelete(req.params.id);
//     if (!lead) {
//       return res.status(404).json({ success: false, message: "Lead not found" });
//     }
//     res.json({ success: true, message: "Lead deleted successfully" });
//   } catch (err) {
//     console.error(" deleteLead error:", err);
//     res.status(500).json({ success: false, message: "Error deleting lead" });
//   }
// };

// // 🔹 Bulk Upload Leads
// exports.bulkUploadLeads = async (req, res) => {
//   try {
//     const { leads } = req.body;

//     if (!Array.isArray(leads) || leads.length === 0) {
//       return res.status(400).json({ message: "Leads array is required" });
//     }

//     const processedLeads = [];
//     for (const lead of leads) {
//       const errorMsg = validateLeadData(lead);
//       if (errorMsg) {
//         return res.status(400).json({ message: `Validation failed for ${lead.customerName || "Unknown"}: ${errorMsg}` });
//       }

//       let user = null;
//       if (lead.assignTo) {
//         user = await resolveAssignTo(lead.assignTo);
//         if (!user) {
//           return res.status(400).json({ message: `Invalid assignTo user for lead: ${lead.customerName}` });
//         }
//       }

//       processedLeads.push({
//         ...lead,
//         assignTo: user ? user._id : null
//       });
//     }

//     const insertedLeads = await Lead.insertMany(processedLeads, { ordered: false });

//     res.status(201).json({
//       success: true,
//       message: "Bulk upload successful",
//       insertedCount: insertedLeads.length,
//       insertedLeads,
//     });
//   } catch (error) {
//     console.error("❌ bulkUploadLeads error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error during bulk upload",
//       error: error.message,
//     });
//   }
// };

// exports.getLeadsByUserName = async (req, res) => {
//   try {
//     const { name } = req.query; // pass ?name=Abhishek Singh

//     if (!name) {
//       return res.status(400).json({ error: "User name is required" });
//     }

//     const leads = await Lead.find()
//       .populate({
//         path: "assignTo",
//         match: { name: { $regex: new RegExp("^" + name + "$", "i") } },
//         select: "name email"
//       })
//       .sort({ createdAt: -1 });

//     // Filter out leads where assignTo was not matched
//     const filteredLeads = leads.filter(lead => lead.assignTo);

//     res.status(200).json(filteredLeads);
//   } catch (err) {
//     console.error("Error fetching leads:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// };


// exports.bulkAssignLeads = async (req, res) => {
//   try {
//     const { leadIds, assignTo } = req.body;

//     if (!Array.isArray(leadIds) || leadIds.length === 0) {
//       return res.status(400).json({ success: false, message: "leadIds array is required" });
//     }
//     if (!assignTo) {
//       return res.status(400).json({ success: false, message: "assignTo field is required" });
//     }

//     // Resolve the user
//     const user = await resolveAssignTo(assignTo);
//     if (!user) {
//       return res.status(400).json({ success: false, message: "Invalid assignTo user" });
//     }

//     // Bulk update
//     const result = await Lead.updateMany(
//       { _id: { $in: leadIds } },
//       { $set: { assignTo: user._id } }
//     );

//     res.json({
//       success: true,
//       message: ` ${result.modifiedCount} leads assigned successfully to ${user.name}`,
//       count: result.modifiedCount,
//       assignedTo: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//       },
//     });
//   } catch (err) {
//     console.error(" bulkAssignLeads error:", err);
//     res.status(500).json({ success: false, message: "Error assigning leads in bulk" });
//   }
// };


// exports.getLeadsByCapturedBy = async (req, res) => {
//   try {
//     const { capturedBy } = req.query; // pass ?capturedBy=Abhishek

//     if (!capturedBy) {
//       return res.status(400).json({
//         success: false,
//         message: "capturedBy query parameter is required (e.g. ?capturedBy=Abhishek)"
//       });
//     }

//     // ✅ Case-insensitive match for capturedBy
//     const filter = { capturedBy: { $regex: new RegExp(`^${capturedBy}$`, "i") } };

//     // ✅ Fetch all matching leads (most recent first)
//     const leads = await Lead.find(filter).sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       capturedBy,
//       totalLeads: leads.length,
//       leads,
//       message: `Total leads captured by ${capturedBy}: ${leads.length}`
//     });
//   } catch (err) {
//     console.error("❌ getLeadsByCapturedBy error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Server error fetching leads by capturedBy"
//     });
//   }
// };



// exports.getLeadChangeHistory = async (req, res) => {
//   try {
//     const { leadId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(leadId)) {
//       return res.status(400).json({ success: false, message: 'Invalid lead ID' });
//     }

//     const history = await LeadHistory.find({ leadId })
//       .sort({ changedAt: -1 });

//     return res.status(200).json({
//       success: true,
//       totalChanges: history.length,
//       data: history
//     });
//   } catch (err) {
//     console.error('getLeadChangeHistory error:', err);
//     return res.status(500).json({ success: false, message: 'Error fetching lead change history' });
//   }
// };

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
exports.getLeads = async (req, res) => {
  try {
    if (!req.user || !req.user._id) return res.status(401).json({ success: false, message: "Unauthorized" });

    const userRole = req.user.role || "user";
    let filter = {};

    if (userRole !== "admin") {
      filter = { transferTo: req.user._id };
    }

    const leads = await Lead.find(filter).sort({ createdAt: -1 }).populate("assignedTo transferTo capturedBy", "name email");
    res.json({ success: true, role: userRole, count: leads.length, data: leads });

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
