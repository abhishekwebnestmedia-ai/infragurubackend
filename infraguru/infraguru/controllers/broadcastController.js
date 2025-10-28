// const Broadcast = require("../models/broadcast");

// // ✅ Create Broadcast (Admin only)
// exports.createBroadcast = async (req, res) => {
//   try {
//     const { groupId, message } = req.body;

//     if (!req.user || req.user.role !== "admin") {
//       return res.status(403).json({ success: false, message: "Access denied" });
//     }

//     if (!groupId || !message) {
//       return res.status(400).json({ success: false, message: "Group ID and message are required" });
//     }

//     const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;
//     const attachmentType = req.file ? req.file.mimetype : null;

//     const broadcast = await Broadcast.create({
//       group: groupId,
//       message,
//       attachmentUrl,
//       attachmentType,
//       createdBy: req.user.userId
//     });

//     const io = req.app.get("io");
//     io.emit("newBroadcast", broadcast);

//     res.status(201).json({ success: true, broadcast });
//   } catch (err) {
//     console.error("Error creating broadcast:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// // ✅ Get broadcasts for a group
// exports.getGroupBroadcasts = async (req, res) => {
//   try {
//     const { groupId } = req.params;

//     const broadcasts = await Broadcast.find({ group: groupId })
//       .populate("createdBy", "name email")
//       .sort({ createdAt: -1 });

//     res.json({ success: true, broadcasts });
//   } catch (err) {
//     console.error("Error fetching broadcasts:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };


const Broadcast = require("../models/broadcast");

// ✅ Create Broadcast (Admin only)
exports.createBroadcast = async (req, res) => {
  try {
    const { groupId, message } = req.body;

    // 🔒 Only admin users can send broadcasts
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // 🧩 groupId is required
    if (!groupId) {
      return res.status(400).json({ success: false, message: "Group ID is required" });
    }

    // 🧩 At least one of message or attachment must be provided
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
      group: groupId,
      message: message || "", // allow empty message if only file
      attachmentUrl,
      attachmentType,
      createdBy: req.user.userId,
    });

    // 📢 Emit socket event if io exists
    const io = global.io || req.app.get("io");
    if (io) {
      io.emit("newBroadcast", broadcast);
    }

    // ✅ Respond with created broadcast
    res.status(201).json({ success: true, broadcast });
  } catch (err) {
    console.error("Error creating broadcast:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get broadcasts for a group
exports.getGroupBroadcasts = async (req, res) => {
  try {
    const { groupId } = req.params;

    const broadcasts = await Broadcast.find({ group: groupId })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, broadcasts });
  } catch (err) {
    console.error("Error fetching broadcasts:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// exports.getGroupBroadcasts = async (req, res) => {
//   try {
//     const { groupId } = req.params;

//     const broadcasts = await Broadcast.find({ group: groupId })
//       .populate("createdBy", "name email")
//       .sort({ createdAt: -1 });

//     // ✅ Convert relative file paths into full URLs
//     const formatted = broadcasts.map((b) => ({
//       _id: b._id,
//       message: b.message,
//       createdBy: b.createdBy,
//       createdAt: b.createdAt,
//       attachmentUrl: b.attachmentUrl
//         ? `${req.protocol}://${req.get("host")}${b.attachmentUrl}`
//         : null,
//       attachmentType: b.attachmentType,
//     }));

//     res.json({ success: true, broadcasts: formatted });
//   } catch (err) {
//     console.error("Error fetching broadcasts:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

