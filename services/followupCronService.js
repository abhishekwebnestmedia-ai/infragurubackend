



const cron = require("node-cron");
const Lead = require("../models/leadModel");
const Notification = require("../models/notification");
const { emitNotification } = require("../utils/socketEmitter");

// ✅ Convert JS Date → IST string
function formatISTDate(date) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(date.getTime() + istOffset);
  return ist.toISOString().replace("T", " ").substring(0, 19);
}

// ✅ Run every minute
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    const leads = await Lead.find({
      status: "Follow Ups",
      followUp: { $gte: new Date(now.getTime() - 60 * 1000), $lte: new Date(now.getTime() + 90 * 1000) },
    });

    if (!leads.length) {
      console.log("No follow-ups this minute.");
      return;
    }

    for (const lead of leads) {
      const diffSec = Math.abs(new Date(lead.followUp).getTime() - now.getTime()) / 1000;
      const timingType = diffSec < 60 ? "⏰ It's follow-up time!" : "🕐 Upcoming follow-up!";
      const msg = `${timingType} Contact ${lead.clientName} (${lead.contactNumber}) now. Requirement: ${lead.requirement || "N/A"}`;

      const exists = await Notification.findOne({
        type: "Lead",
        itemId: lead._id,
        message: msg,
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
      });

      if (exists) continue;

      const notif = await Notification.create({
        type: "Lead",
        itemId: lead._id,
        message: msg,
        category: "followup",
      });

      console.log(`📨 Follow-up notification saved for ${lead.clientName}`);

      // ✅ Targeted real-time notification
      const payload = {
        type: "Lead",
        itemId: lead._id,
        message: msg,
        category: "followup",
        createdAt: notif.createdAt,
      };

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

console.log("✅ Follow-up cron job initialized (every minute).");
