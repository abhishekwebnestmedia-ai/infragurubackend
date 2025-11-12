

const Lead = require('../models/leadModel');
const User = require('../models/user');
const mongoose = require("mongoose");
const LeadHistory = require("../models/leadHistory");
const Notification = require("../models/notification");


// Valid statuses for leads
const validStatuses = [
 
      "Follow Ups",
      "Not Connected",
      "Prospect",
      "Closer",
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
// exports.createLead = async (req, res) => {
//   try {
//     const errorMsg = validateLeadData(req.body);
//     if (errorMsg) return res.status(400).json({ success: false, message: errorMsg });

//     const { assignedTo, transferTo, capturedBy, ...leadData } = req.body;

//     const existingLead = await Lead.findOne({
//       email: leadData.email,
//       contactNumber: leadData.contactNumber
//     });
//     if (existingLead) return res.status(400).json({ success: false, message: "Lead with same email & contact exists" });

//     const assignedUser = await resolveUser(assignedTo);
//     const transferUser = await resolveUser(transferTo);
//     const capturedUser = await resolveUser(capturedBy);

//     const lead = new Lead({
//       ...leadData,
//       assignedTo: assignedUser?._id || null,
//       transferTo: transferUser?._id || null,
//       capturedBy: capturedUser?._id || null
//     });

//     await lead.save();
//     const populatedLead = await lead.populate("assignedTo transferTo capturedBy", "name email");
//     res.status(201).json({ success: true, data: populatedLead });

//   } catch (err) {
//     console.error("createLead error:", err);
//     res.status(500).json({ success: false, message: "Server error creating lead" });
//   }
// };


exports.createLead = async (req, res) => {
  try {
    const errorMsg = validateLeadData(req.body);
    if (errorMsg)
      return res.status(400).json({ success: false, message: errorMsg });

    const { assignedTo, transferTo, capturedBy, ...leadData } = req.body;

    // Prevent duplicate leads
    const existingLead = await Lead.findOne({
      email: leadData.email,
      contactNumber: leadData.contactNumber,
    });
    if (existingLead)
      return res
        .status(400)
        .json({ success: false, message: "Lead with same email & contact exists" });

    const assignedUser = await resolveUser(assignedTo);
    const transferUser = await resolveUser(transferTo);
    const capturedUser = await resolveUser(capturedBy);

    const lead = new Lead({
      ...leadData,
      assignedTo: assignedUser?._id || null,
      transferTo: transferUser?._id || null,
      capturedBy: capturedUser?._id || null,
    });

    await lead.save();
    const populatedLead = await lead.populate(
      "assignedTo transferTo capturedBy",
      "name email"
    );

    // ✅ FOLLOW-UP NOTIFICATION ON CREATION
    if (lead.status === "Follow Ups" && lead.followUp) {
      const followUpTime = new Date(lead.followUp);
      const formattedTime = followUpTime.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const msg = `🕐 Follow-up scheduled for ${lead.clientName} at ${formattedTime}. Requirement: ${lead.requirement || "N/A"}`;

      // Prevent duplicates
      const exists = await Notification.findOne({
        type: "Lead",
        itemId: lead._id,
        message: msg,
      });

      if (!exists) {
        await Notification.create({
          type: "Lead",
          itemId: lead._id,
          message: msg,
          category: "followup",
          changedBy: req.user ? req.user.name : "System",
        });

        console.log(`📨 Follow-up notification created for ${lead.clientName}`);

        // ✅ Emit to all connected users
        if (global.io) {
          global.io.emit("followup_notification", {
            type: "Lead",
            leadId: lead._id,
            message: msg,
          });
        }
      }
    }

    res.status(201).json({ success: true, data: populatedLead });
  } catch (err) {
    console.error("createLead error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error creating lead" });
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




exports.getLeads = async (req, res) => {
  try {
    if (!req.user || !req.user._id)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const userRole = req.user.role || "user";
    const isAgent = req.user.isAgent || false;

    let leads = [];

    if (userRole === "admin") {
      // Admin can see all leads
      leads = await Lead.find({})
        .sort({ createdAt: -1 })
        .populate("assignedTo transferTo capturedBy", "name email");
    } else {
      // Step 1: Try fetching leads where transferTo = current user
      leads = await Lead.find({ transferTo: req.user._id })
        .sort({ createdAt: -1 })
        .populate("assignedTo transferTo capturedBy", "name email");

      // Step 2: If none found, fallback to assignedTo = current user
      if (leads.length === 0) {
        leads = await Lead.find({ assignedTo: req.user._id })
          .sort({ createdAt: -1 })
          .populate("assignedTo transferTo capturedBy", "name email");
      }
    }

    res.json({
      success: true,
      role: userRole,
      isAgent,
      count: leads.length,
      data: leads,
    });

  } catch (err) {
    console.error("getLeads error:", err);
    res.status(500).json({ success: false, message: "Server error fetching leads" });
  }
};




exports.getLeadById = async (req, res) => {
  try {
    if (!req.user || !req.user._id)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const isAgent = req.user.isAgent || false; // ✅ get isAgent
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo transferTo capturedBy", "name email");
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    res.json({
      success: true,
      isAgent, // ✅ add isAgent to response
      data: lead
    });
  } catch (err) {
    console.error("getLeadById error:", err);
    res.status(500).json({ success: false, message: "Error fetching lead" });
  }
};






// exports.updateLead = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updateData = { ...req.body };

//     const lead = await Lead.findById(id);
//     if (!lead)
//       return res.status(404).json({ success: false, message: "Lead not found" });

//     const oldStatus = lead.status;

//     // ✅ Resolve user references if needed
//     for (const field of ["assignedTo", "transferTo", "capturedBy"]) {
//       if (updateData[field] !== undefined) {
//         const user = await resolveUser(updateData[field]);
//         if (!user)
//           return res
//             .status(400)
//             .json({ success: false, message: `Invalid ${field} user` });
//         updateData[field] = user._id;
//       }
//     }

//     // ✅ Update lead
//     const updatedLead = await Lead.findByIdAndUpdate(id, updateData, {
//       new: true,
//     }).populate("assignedTo transferTo capturedBy", "name email");

//     // ✅ Send notification if status changed
//     if (updateData.status && updateData.status !== oldStatus) {
//       const msg = `📢 Lead "${lead.clientName}" status changed from "${oldStatus}" to "${updateData.status}".`;

//       await Notification.create({
//         type: "Lead",
//         itemId: lead._id,
//         message: msg,
//         category: "status_change",
//         changedBy: req.user ? req.user.name : "System",
//       });

//       console.log(`📨 Admin notified of status change: ${msg}`);

//       // ✅ Emit to Admins only
//       if (global.io) {
//         const admins = await User.find({ role: "admin" });

//         admins.forEach((admin) => {
//           global.io.to(admin._id.toString()).emit("admin_notification", {
//             type: "Lead",
//             leadId: lead._id,
//             message: msg,
//           });
//         });
//       }
//     }

//     res.json({
//       success: true,
//       message: "Lead updated successfully",
//       data: updatedLead,
//     });
//   } catch (err) {
//     console.error("updateLead error:", err);
//     res.status(500).json({ success: false, message: "Error updating lead" });
//   }
// };


// ================= DELETE LEAD =================



exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const lead = await Lead.findById(id);
    if (!lead)
      return res.status(404).json({ success: false, message: "Lead not found" });

    const oldStatus = lead.status;

    // ✅ Resolve user references if needed
    for (const field of ["assignedTo", "transferTo", "capturedBy"]) {
      if (updateData[field] !== undefined) {
        const user = await resolveUser(updateData[field]);
        if (!user)
          return res
            .status(400)
            .json({ success: false, message: `Invalid ${field} user` });
        updateData[field] = user._id;
      }
    }

    // ✅ Update the lead
    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("assignedTo transferTo capturedBy", "name email");

    // ✅ If status changed, create notification (avoid duplicates)
    if (updateData.status && updateData.status !== oldStatus) {
      const msg = `📢 Lead "${lead.clientName}" status changed from "${oldStatus}" to "${updateData.status}".`;

      try {
        await Notification.create({
          type: "Lead",
          itemId: lead._id,
          message: msg,
          category: "status_change",
          changedBy: req.user ? req.user._id : null, // store user ID for socket targeting
        });

        console.log(`📨 Notification created for lead status change: ${msg}`);
      } catch (err) {
        if (err.code === 11000) {
          console.log(`⚠️ Duplicate notification skipped for ${lead.clientName}`);
        } else {
          console.error("❌ Notification creation error:", err);
        }
      }

      // ✅ Emit real-time notification
      if (global.io) {
        // Notify all admins
        const admins = await User.find({ role: "admin" });
        const payload = {
          type: "Lead",
          leadId: lead._id,
          message: msg,
          category: "status_change",
        };

        admins.forEach((admin) => {
          global.io.to(`notif_${admin._id}`).emit("notification_received", payload);
        });

        // Also notify the assigned user if available
        if (updatedLead.assignedTo?._id) {
          global.io
            .to(`notif_${updatedLead.assignedTo._id}`)
            .emit("notification_received", payload);
        }

        console.log("📩 Emitted notification to admins and assigned user.");
      }
    }

    res.json({
      success: true,
      message: "Lead updated successfully",
      data: updatedLead,
    });
  } catch (err) {
    console.error("updateLead error:", err);
    res.status(500).json({ success: false, message: "Error updating lead" });
  }
};







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


// DELETE /api/leads?ids=123,456,789
exports.deletebulk = async (req, res) => {
  try {
    // Get comma-separated IDs from query or JSON body
    const ids = req.query.ids || req.body.ids;
    if (!ids || !ids.length) {
      return res.status(400).json({ success: false, message: "No lead IDs provided" });
    }

    // Convert string IDs to array if needed
    const leadIds = Array.isArray(ids) ? ids : ids.split(',');

    // Delete leads in bulk
    const result = await Lead.deleteMany({ _id: { $in: leadIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} lead(s) deleted successfully`
    });

  } catch (err) {
    console.error("deleteLeads error:", err);
    res.status(500).json({ success: false, message: "Error deleting leads" });
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


exports.getLeadsByUserName = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username)
      return res.status(400).json({ success: false, message: "username query param required" });

    // Find user and include isAgent
    const user = await User.findOne({ name: username }).select("name email isAgent");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // ✅ Find leads where this user is in transferTo
    const leads = await Lead.find({ transferTo: user._id })
      .populate("assignedTo transferTo capturedBy", "name email isAgent");

    res.json({
      success: true,
      isAgent: user.isAgent,
      count: leads.length,
      data: leads
    });
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

// ================= TEAM ASSIGNED SUMMARY =================
exports.getTeamAssigned = async (req, res) => {
  try {
    console.log("🔹 Starting getTeamAssigned");

    // ✅ Fetch ALL users (no role restriction)
    const users = await User.find({}, "name role"); // Only fetch necessary fields
    console.log("✅ Users found:", users.length);

    // ✅ Fetch all leads (populate transferTo)
    const allLeads = await Lead.find().populate("transferTo", "name");
    console.log("✅ Leads found:", allLeads.length);

    // ✅ Define the statuses you care about
    const validStatuses = ["Follow Ups", "Not Connected", "Prospect", "Closer"];

    // ✅ Build response data for each user
    const results = users.map((user) => {
      // Leads assigned to this user
      const userLeads = allLeads.filter(
        (lead) =>
          lead.transferTo &&
          lead.transferTo._id &&
          lead.transferTo._id.toString() === user._id.toString()
      );

      // Total leads count
      const totalLeads = userLeads.length;

      // Count Hot leads (if relevant)
      const hotLeads = userLeads.filter((l) => l.status === "Hot").length;

      // Status breakdown
      const statusBreakdown = {};
      validStatuses.forEach((status) => {
        statusBreakdown[status] = userLeads.filter(
          (l) => l.status === status
        ).length;
      });

      return {
        name: user.name,
        role: user.role,
        totalLeads,
        hotLeads,
        statusBreakdown,
      };
    });

    console.log("✅ Processed users summary successfully");
    return res.status(200).json({
      success: true,
      totalUsers: results.length,
      data: results,
    });
  } catch (err) {
    console.error("❌ getTeamAssigned error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching lead summary",
      error: err.message,
    });
  }
};



exports.getDashboardLead = async (req, res) => {
  try {
    // ✅ Define valid statuses
    const validStatuses = ["Follow Ups", "Not Connected", "Prospect", "Closer"];

    // ✅ Fetch ALL leads (no user filter)
    const allLeads = await Lead.find();

    // ✅ Calculate counts per status
    const statusCounts = {};
    validStatuses.forEach((status) => {
      statusCounts[status] = allLeads.filter((lead) => lead.status === status).length;
    });

    // ✅ Compute total count of all leads
    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    // ✅ Return structured JSON response
    res.status(200).json({
      success: true,
      total,
      data: statusCounts,
    });
  } catch (err) {
    console.error("❌ getDashboardLead error:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching dashboard lead summary",
      error: err.message,
    });
  }
};




// Get user lead statistics for dashboard
exports.getUserLeadStats = async (req, res) => {
  try {
    const { userName } = req.params;
    
    if (!userName) {
      return res.status(400).json({
        success: false,
        message: "Username parameter is required"
      });
    }

    // Find the user
    const user = await User.findOne({ name: userName }).select("name email role isAgent");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get leads for the user
    const leads = await Lead.find({
      $or: [
        { assignedTo: user._id },
        { transferTo: user._id },
        { capturedBy: user._id }
      ]
    });

    // Calculate statistics
    const statusCounts = {
      "Follow Ups": 0,
      "Not Connected": 0,
      "Prospect": 0,
      "Closer": 0
    };

    leads.forEach(lead => {
      if (statusCounts.hasOwnProperty(lead.status)) {
        statusCounts[lead.status]++;
      }
    });

    // Get recent activity
    const recentActivity = await LeadHistory.find({
      leadId: { $in: leads.map(l => l._id) }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("leadId", "clientName status");

    // Calculate conversion rates
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.status === "Closer").length;
    const conversionRate = totalLeads ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0;

    const response = {
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          isAgent: user.isAgent
        },
        stats: {
          totalLeads,
          statusBreakdown: statusCounts,
          conversionRate: parseFloat(conversionRate),
          recentActivity: recentActivity.map(activity => ({
            date: activity.createdAt,
            leadName: activity.leadId.clientName,
            status: activity.leadId.status,
            changes: activity.changes
          }))
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error("❌ getUserLeadStats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user lead statistics",
      error: error.message
    });
  }
};



// exports.getUnassignedLeads = async (req, res) => {
//   try {
//     console.log("➡️ Fetching unassigned leads (based on assignedTo)...");

//     const unassignedLeads = await Lead.find({
//       $or: [
//         { assignedTo: { $exists: false } },
//         { assignedTo: null },
//         { assignedTo: "" },
//       ],
//     })
//       .sort({ createdAt: -1 })
//       .populate("assignedTo transferTo capturedBy", "name email");

//     console.log(`✅ Found ${unassignedLeads.length} unassigned leads`);

//     res.status(200).json({
//       success: true,
//       count: unassignedLeads.length,
//       message: "Unassigned leads fetched successfully (based on assignedTo)",
//       leads: unassignedLeads,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching unassigned leads:", error.message);
//     console.error(error.stack); // 👈 print full error
//     res.status(500).json({
//       success: false,
//       message: "Server error fetching unassigned leads",
//       error: error.message,
//     });
//   }
// };


exports.getUnassignedLeads = async (req, res) => {
  try {
    console.log("➡️ Fetching unassigned leads (based on assignedTo)...");

    const unassignedLeads = await Lead.find({
      $or: [
        { assignedTo: { $exists: false } },
        { assignedTo: null }
      ],
    })
      .sort({ createdAt: -1 })
      .populate("assignedTo transferTo capturedBy", "name email");

    console.log(`✅ Found ${unassignedLeads.length} unassigned leads`);

    res.status(200).json({
      success: true,
      count: unassignedLeads.length,
      message: "Unassigned leads fetched successfully (based on assignedTo)",
      leads: unassignedLeads,
    });
  } catch (error) {
    console.error("❌ Error fetching unassigned leads:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching unassigned leads",
      error: error.message,
    });
  }
};



exports.createFrom99acres = async (req, res) => {
  try {
    const { secret } = req.query;

    // 🔒 Validate secret key
    if (secret !== process.env.LEAD_WEBHOOK_SECRET) {
      return res.status(403).json({ success: false, message: "Unauthorized source" });
    }

    const data = req.body || {};

    // 🧠 Helper for safe defaults
    const safe = (val, fallback) =>
      val && val.toString().trim() !== "" ? val : fallback;

    // ✅ Prepare lead data according to your Lead schema
    const leadData = {
      clientName: safe(data.customerName || data.name, "Unknown Lead"),
      contactNumber: safe(data.contactNumber || data.phone, "0000000000"),
      email: safe(data.email, "unknown@example.com"),
      status: safe(data.status, "Not Connected"),
      source: "99acres",
      budget: safe(data.budget, "Not Provided"),
      location: safe(data.city || data.location, "N/A"),
      projects: safe(data.project, "N/A"),
      remark: `Lead from 99acres. Project: ${safe(
        data.project,
        "N/A"
      )}, City: ${safe(data.city, "N/A")}, Budget: ${safe(
        data.budget,
        "Not mentioned"
      )}`,
      capturedBy: null, // since webhook, no user assigned
    };

    // ✅ Save new lead
    const lead = new Lead(leadData);
    await lead.save();

    res.status(201).json({
      success: true,
      message: "✅ Lead received and saved successfully",
      data: lead,
    });
  } catch (err) {
    console.error("❌ 99acres webhook error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while saving 99acres lead",
    });
  }
};
