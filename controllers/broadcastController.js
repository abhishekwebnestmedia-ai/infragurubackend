



const Broadcast = require("../models/broadcast");
const Group = require("../models/group");

// ✅ Create Broadcast (Admin only)
exports.createBroadcast = async (req, res) => {
  try {
    const { groupId, message } = req.body;

    // 🔒 Only admin users can send broadcasts
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied — only admins can send broadcasts" });
    }

    // 🧩 groupId is required
    if (!groupId) {
      return res.status(400).json({ success: false, message: "Group ID is required" });
    }

    // ✅ Verify that group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // 🧩 Validate content — at least message or attachment must exist
    if (!message && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Either a message or an attachment must be provided",
      });
    }

    // 📎 Handle optional attachment
    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const attachmentType = req.file ? req.file.mimetype : null;

    // 💾 Save broadcast to database
    const broadcast = await Broadcast.create({
      group: group._id,
      message: message || "",
      attachmentUrl,
      attachmentType,
      createdBy: req.user._id, // ✅ Fixed to use _id (consistent with Group API)
    });

    // 🧩 Populate before sending response
    const populatedBroadcast = await Broadcast.findById(broadcast._id)
      .populate("createdBy", "name email role")
      .populate("group", "name");

    // 📢 Emit socket event (to specific group room, not globally)
    const io = global.io || req.app.get("io");
    if (io) {
      io.to(groupId.toString()).emit("newBroadcast", populatedBroadcast);
    }

    // ✅ Respond with populated broadcast
    res.status(201).json({
      success: true,
      message: "Broadcast sent successfully",
      broadcast: populatedBroadcast,
    });
  } catch (err) {
    console.error("❌ Error creating broadcast:", err);
    res.status(500).json({
      success: false,
      message: "Server error while creating broadcast",
      error: err.message,
    });
  }
};


// ✅ Get all broadcasts for a specific group
exports.getGroupBroadcasts = async (req, res) => {
  try {
    const { groupId } = req.params;

    // ✅ Verify group existence
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // 📦 Fetch all broadcasts for this group
    const broadcasts = await Broadcast.find({ group: groupId })
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: broadcasts.length,
      broadcasts,
    });
  } catch (err) {
    console.error("❌ Error fetching broadcasts:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching broadcasts",
      error: err.message,
    });
  }
};




