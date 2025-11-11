
// const cron = require("node-cron");
// const Lead = require("../models/leadModel");
// // const Inventory = require("../models/inventryModel");
// const Notification = require("../models/notification");

// // ✅ Convert JS Date → IST string ("YYYY-MM-DD HH:mm:ss")
// function formatISTDate(date) {
//   const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 hrs
//   const ist = new Date(date.getTime() + istOffset);
//   return ist.toISOString().replace("T", " ").substring(0, 19);
// }

// // ✅ Unified follow-up checker (runs every minute)
// cron.schedule("* * * * *", async () => {
//   try {
//     const now = new Date();

//     // --- Trigger 1 minute BEFORE follow-up time ---
//     const targetStart = new Date(now.getTime() + 30 * 1000); // +30 sec
//     const targetEnd = new Date(now.getTime() + 90 * 1000);   // +90 sec

//     const startStr = formatISTDate(targetStart);
//     const endStr = formatISTDate(targetEnd);

//     console.log(` Checking follow-ups (1 min before) between ${startStr} and ${endStr}`);

//     // ----------------- LEADS -----------------
//     const leads = await Lead.find({
//       followUp: { $gte: startStr, $lte: endStr }
//     });

//     for (const lead of leads) {
//       const msg = ` Reminder: Follow up with ${lead.customerName} (${lead.contactNumber}) at ${new Date(lead.followUp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}. Requirement: ${lead.requirement}.`;

//       // 🔹 Prevent duplicates created within last 2 mins
//       const exists = await Notification.findOne({
//         type: "Lead",
//         itemId: lead._id,
//         message: msg,
//         createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
//       });

//       if (exists) {
//         console.log(` Skipped duplicate lead notification for ${lead.customerName}`);
//         continue;
//       }

//       try {
//         await Notification.create({ type: "Lead", itemId: lead._id, message: msg });
//         console.log(` Lead notification created for ${lead.customerName}`);

//         if (global.io) {
//           global.io.emit("followup_notification", {
//             type: "Lead",
//             leadId: lead._id,
//             message: msg,
//           });
//         }
//       } catch (err) {
//         if (err.code === 11000) {
//           console.log(` Duplicate lead notification blocked by DB: ${lead.customerName}`);
//         } else {
//           console.error(" Lead notification error:", err);
//         }
//       }
//     }


//     if (!leads.length ) {
//       console.log(" No follow-ups this minute.");
//     }
//   } catch (err) {
//     console.error(" followUpCronService error:", err);
//   }
// });

// console.log(" Follow-up cron job initialized (every minute).");







// const cron = require("node-cron");
// const Lead = require("../models/leadModel");
// const Notification = require("../models/notification");

// // ✅ Convert JS Date → IST string ("YYYY-MM-DD HH:mm:ss")
// function formatISTDate(date) {
//   const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 hrs
//   const ist = new Date(date.getTime() + istOffset);
//   return ist.toISOString().replace("T", " ").substring(0, 19);
// }

// // ✅ Run every minute
// cron.schedule("* * * * *", async () => {
//   try {
//     const now = new Date();

//     const beforeStart = new Date(now.getTime() + 30 * 1000);
//     const beforeEnd = new Date(now.getTime() + 90 * 1000);
//     const exactStart = new Date(now.getTime() - 30 * 1000);
//     const exactEnd = new Date(now.getTime() + 30 * 1000);

//     const leads = await Lead.find({
//       status: "Follow Ups",
//       followUp: { $gte: new Date(now.getTime() - 60 * 1000), $lte: new Date(now.getTime() + 90 * 1000) },
//     });

//     if (!leads.length) {
//       console.log("No follow-ups this minute.");
//       return;
//     }

//     for (const lead of leads) {
//       const followUpTime = new Date(lead.followUp);
//       const diffSec = Math.abs(followUpTime.getTime() - now.getTime()) / 1000;
//       const timingType = diffSec < 60 ? "⏰ It's follow-up time!" : "🕐 Upcoming follow-up!";

//       const msg = `${timingType} Contact ${lead.clientName} (${lead.contactNumber}) now. Requirement: ${lead.requirement || "N/A"}`;

//       const exists = await Notification.findOne({
//         type: "Lead",
//         itemId: lead._id,
//         message: msg,
//         createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
//       });

//       if (exists) continue;

//       await Notification.create({
//         type: "Lead",
//         itemId: lead._id,
//         message: msg,
//         category: "followup",
//       });

//       console.log(`📨 Follow-up notification sent for ${lead.clientName}`);

//       // ✅ Emit to all connected users
//       if (global.io) {
//         global.io.emit("followup_notification", {
//           type: "Lead",
//           leadId: lead._id,
//           message: msg,
//         });
//       }
//     }
//   } catch (err) {
//     console.error("❌ followUpCronService error:", err);
//   }
// });

// console.log("✅ Follow-up cron job initialized (every minute).");




const cron = require("node-cron");
const Lead = require("../models/leadModel");
const Notification = require("../models/notification");
const { emitNotification } = require("../utils/socketEmitter");

// ✅ Helper: Get IST date/time
function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset);
}

// ✅ Helper: Format IST date for logs (optional)
function formatISTDate(date) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(date.getTime() + istOffset);
  return ist.toISOString().replace("T", " ").substring(0, 19);
}

// ✅ Run every minute (check every 60 seconds)
cron.schedule("* * * * *", async () => {
  try {
    // Current IST time
    const nowIST = getISTDate();

    // Create a small ±30-second window to avoid millisecond mismatches
    const lowerBound = new Date(nowIST.getTime() - 30 * 1000);
    const upperBound = new Date(nowIST.getTime() + 30 * 1000);

    console.log("🕒 Checking follow-ups between:", formatISTDate(lowerBound), "→", formatISTDate(upperBound));

    // Find leads whose followUp time falls in this IST window
    const leads = await Lead.find({
      status: { $regex: /^follow ups$/i },
      followUp: { $gte: lowerBound, $lte: upperBound },
    });

    if (!leads.length) {
      console.log("No follow-ups this minute.");
      return;
    }

    // Loop through each lead found
    for (const lead of leads) {
      const msg = `⏰ It's follow-up time! Contact ${lead.clientName} (${lead.contactNumber}) now. Requirement: ${lead.requirement || "N/A"}`;

      // Prevent duplicate notifications within 2 minutes
      const exists = await Notification.findOne({
        type: "Lead",
        itemId: lead._id,
        message: msg,
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
      });

      if (exists) continue;

      // Create notification
      const notif = await Notification.create({
        type: "Lead",
        itemId: lead._id,
        message: msg,
        category: "followUp", // ✅ correct enum
      });

      console.log(`📨 Follow-up notification sent for ${lead.clientName} at ${formatISTDate(nowIST)}`);

      // Prepare payload
      const payload = {
        type: "Lead",
        itemId: lead._id,
        message: msg,
        category: "followUp",
        createdAt: notif.createdAt,
      };

      // Emit real-time notification
      if (lead.assignedTo) {
        emitNotification(lead.assignedTo.toString(), payload);
      } else {
        global.io.emit("notification_received", payload);
      }
    }
  } catch (err) {
    console.error("❌ followUpCronService error:", err);
  }
});

console.log("✅ Follow-up cron job initialized (every minute, IST based).");


