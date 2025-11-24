

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

// ✅ Helper: Format IST date for logs
function formatISTDate(date) {
  return new Date(date).toISOString().replace("T", " ").substring(0, 19);
}

// ✅ Main cron initializer function
function initializeFollowUpCron() {
  cron.schedule("* * * * *", async () => {
    try {
      const nowUTC = new Date(); // MongoDB uses UTC internally
      const lowerBound = new Date(nowUTC.getTime() - 30 * 1000);
      const upperBound = new Date(nowUTC.getTime() + 30 * 1000);

      console.log("🕒 Checking follow-ups between (UTC):", lowerBound, "→", upperBound);

      // Find leads whose follow-up time falls in this UTC window
      const leads = await Lead.find({
        status: { $regex: /^follow ups$/i },
        followUp: { $gte: lowerBound, $lte: upperBound },
      });

      if (!leads.length) {
        console.log("No follow-ups this minute.");
        return;
      }

      console.log(`📋 Found ${leads.length} follow-up lead(s).`);

      for (const lead of leads) {
        const msg = `⏰ It's follow-up time! Contact ${lead.clientName} (${lead.contactNumber}) now. Requirement: ${lead.requirement || "N/A"}`;
        const nowIST = getISTDate();

        // Prevent duplicate notifications (within last 2 min)
        const exists = await Notification.findOne({
          type: "Lead",
          itemId: lead._id,
          message: msg,
          createdAt: { $gte: new Date(nowIST.getTime() - 2 * 60 * 1000) },
        });

        if (exists) {
          console.log(`⚠️ Skipping ${lead.clientName} — notification already exists.`);
          continue;
        }

        // Create notification
        const notif = await Notification.create({
          type: "Lead",
          itemId: lead._id,
          message: msg,
          category: "followUp",
        });

        console.log(`📨 Follow-up notification created for ${lead.clientName} at ${formatISTDate(nowIST)}`);

        const payload = {
          type: "Lead",
          itemId: lead._id,
          message: msg,
          category: "followUp",
          createdAt: notif.createdAt,
        };

        // Emit notification to the assigned user or globally
        if (lead.assignedTo) {
          emitNotification(lead.assignedTo.toString(), payload);
          console.log(`📢 Emitted follow-up to user ${lead.assignedTo}`);
        } else {
          global.io.emit("notification_received", payload);
          console.log("📢 Emitted global follow-up notification");
        }
      }
    } catch (err) {
      console.error("❌ followUpCronService error:", err);
    }
  });

  console.log("✅ Follow-up cron job initialized (every minute).");
}

// Export so server.js can call it
module.exports = initializeFollowUpCron;
