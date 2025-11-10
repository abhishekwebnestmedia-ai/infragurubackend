// const Group = require("../models/group");
// const User = require("../models/user");

// // ✅ Create a new group (Admin only)
// exports.createGroup = async (req, res) => {
//   try {
//     if (!req.user || req.user.role !== "admin") {
//       return res.status(403).json({ success: false, message: "Access denied" });
//     }

//     const { name, members } = req.body;

//     if (!name) {
//       return res.status(400).json({ success: false, message: "Group name is required" });
//     }
//     if (!Array.isArray(members) || members.length === 0) {
//       return res.status(400).json({ success: false, message: "Please provide at least one member name" });
//     }

//     const matchedUsers = await User.find({
//       name: { $in: members.map((n) => new RegExp(`^${n}$`, "i")) },
//     });

//     if (matchedUsers.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No valid users found with the provided names",
//       });
//     }

//     // ✅ Create group
//     let group = await Group.create({
//       name,
//      createdBy: req.user.userId,
//       members: matchedUsers.map((u) => u._id),
//     });

    
//     // ✅ Populate members & createdBy before sending response
//     group = await group.populate("members", "name email role");
//     group = await group.populate("createdBy", "name email role");

//     res.status(201).json({
//       success: true,
//       message: "Group created successfully",
//       group,
//     });
//   } catch (error) {
//     console.error("❌ Error creating group:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };


// // ✅ Get groups visible to the logged-in user
// exports.getAllGroups = async (req, res) => {
//   try {
//     let query = {};

//     // 🧭 If user (not admin), show only groups they belong to
//     if (req.user.role !== "admin") {
//       query = { members: req.user._id };
//     }

//     const groups = await Group.find(query)
//       .populate("createdBy", "name email role")
//       .populate("members", "name email role");

//     res.json({ success: true, count: groups.length, groups });
//   } catch (error) {
//     console.error("❌ Error fetching groups:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };





const Group = require("../models/group");
const User = require("../models/user");
const Broadcast = require("../models/broadcast");

// ✅ Create a new group (Admin only)
exports.createGroup = async (req, res) => {
  try {
    // 🧠 Only admin can create groups
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied — only admins can create groups",
      });
    }

    const { name, members } = req.body;

    // 🔍 Validate input
    if (!name || typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Group name is required and must be a string",
      });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one member name",
      });
    }

    // 🔍 Match users by name (case-insensitive)
    const matchedUsers = await User.find({
      name: { $in: members.map((n) => new RegExp(`^${n}$`, "i")) },
    });

    if (matchedUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid users found with the provided names",
      });
    }

    // ✅ Create the group
    let group = await Group.create({
      name,
      createdBy: req.user._id, // ✅ Fixed: use _id instead of userId
      members: matchedUsers.map((u) => u._id),
    });

    // ✅ Populate members & createdBy before sending response
    group = await group.populate("members", "name email role");
    group = await group.populate("createdBy", "name email role");

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      group,
    });
  } catch (error) {
    console.error("❌ Error creating group:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating group",
      error: error.message,
    });
  }
};

// ✅ Get groups visible to the logged-in user + latest broadcast message

// exports.getAllGroups = async (req, res) => {
//   try {
//     let query = {};

//     // 🧭 If user is not admin, only show groups where user is a member
//     if (!req.user || req.user.role !== "admin") {
//       query = { members: req.user._id };
//     }

//     // 📦 Fetch groups with creator & members populated
//     const groups = await Group.find(query)
//       .populate("createdBy", "name email role")
//       .populate("members", "name email role")
//       .lean(); // convert Mongoose docs → plain JS objects for better performance

//     if (!groups || groups.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message:
//           req.user?.role === "admin"
//             ? "No groups found"
//             : "You are not part of any group",
//       });
//     }

//     // 🕐 Attach latest broadcast message to each group
//     const groupsWithBroadcasts = await Promise.all(
//       groups.map(async (group) => {
//         const latestBroadcast = await Broadcast.findOne({ group: group._id })
//           .sort({ createdAt: -1 }) // get most recent
//           .populate("createdBy", "name email role")
//           .lean();

//         return {
//           ...group,
//           latestBroadcast: latestBroadcast
//             ? {
//                 message: latestBroadcast.message,
//                 attachmentUrl: latestBroadcast.attachmentUrl,
//                 attachmentType: latestBroadcast.attachmentType,
//                 createdBy: latestBroadcast.createdBy,
//                 createdAt: latestBroadcast.createdAt,
//               }
//             : null, // No messages yet
//         };
//       })
//     );

//     // ✅ Send final response
//     res.status(200).json({
//       success: true,
//       count: groupsWithBroadcasts.length,
//       groups: groupsWithBroadcasts,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching groups:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error while fetching groups",
//       error: error.message,
//     });
//   }
// };


exports.getAllGroups = async (req, res) => {
  try {
    // 🧠 1️⃣ Ensure "All" group exists
    let allGroup = await Group.findOne({ name: "All" });

    if (!allGroup) {
      const allUsers = await User.find({}, "_id");

      allGroup = await Group.create({
        name: "All",
        members: allUsers.map((u) => u._id),
        createdBy: req.user?._id || null,
      });

      console.log("✅ Default 'All' group created automatically");
    } else {
      const allUsers = await User.find({}, "_id");
      const allUserIds = allUsers.map((u) => u._id.toString());
      const missingUsers = allUserIds.filter(
        (uid) => !allGroup.members.map((m) => m.toString()).includes(uid)
      );

      if (missingUsers.length > 0) {
        allGroup.members.push(...missingUsers);
        await allGroup.save();
        console.log(`🔄 Synced ${missingUsers.length} new users into 'All' group`);
      }
    }

    // 🧭 2️⃣ Build query
    let query = {};
    if (!req.user || req.user.role !== "admin") {
      query = { members: req.user._id };
    }

    // 📦 3️⃣ Fetch all groups (including "All")
    let groups = await Group.find(query)
      .populate("createdBy", "name email role")
      .populate("members", "name email role")
      .lean();

    // 🧩 Ensure "All" group is included
    const hasAllGroup = groups.some((g) => g.name === "All");
    if (!hasAllGroup) {
      const populatedAllGroup = await Group.findOne({ name: "All" })
        .populate("createdBy", "name email role")
        .populate("members", "name email role")
        .lean();
      if (populatedAllGroup) groups.unshift(populatedAllGroup);
    }

    if (!groups || groups.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          req.user?.role === "admin"
            ? "No groups found"
            : "You are not part of any group",
      });
    }

    // 🕐 4️⃣ Attach latest broadcast message
    const groupsWithBroadcasts = await Promise.all(
      groups.map(async (group) => {
        const latestBroadcast = await Broadcast.findOne({ group: group._id })
          .sort({ createdAt: -1 })
          .populate("createdBy", "name email role")
          .lean();

        return {
          ...group,
          latestBroadcast: latestBroadcast
            ? {
                message: latestBroadcast.message,
                attachmentUrl: latestBroadcast.attachmentUrl,
                attachmentType: latestBroadcast.attachmentType,
                createdBy: latestBroadcast.createdBy,
                createdAt: latestBroadcast.createdAt,
              }
            : null,
        };
      })
    );

    // ✅ 5️⃣ Send response
    res.status(200).json({
      success: true,
      count: groupsWithBroadcasts.length,
      groups: groupsWithBroadcasts,
    });
  } catch (error) {
    console.error("❌ Error fetching groups:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching groups",
      error: error.message,
    });
  }
};



// ✅ Update Group (Admin only)

exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, members } = req.body;

    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied — only admins can update groups",
      });
    }

    let group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (name && typeof name === "string") {
      group.name = name.trim();
    }

    if (Array.isArray(members) && members.length > 0) {
      const matchedUsers = await User.find({
        name: { $in: members.map((n) => new RegExp(`^${n}$`, "i")) },
      });

      if (matchedUsers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid users found with the provided names",
        });
      }

      group.members = matchedUsers.map((u) => u._id);
    }

    await group.save();

    // ✅ Repopulate after saving
    group = await Group.findById(group._id)
      .populate("createdBy", "name email role")
      .populate("members", "name email role");

    res.status(200).json({
      success: true,
      message: "Group updated successfully",
      group,
    });
  } catch (error) {
    console.error("❌ Error updating group:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating group",
      error: error.message,
    });
  }
};




