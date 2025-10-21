
const cron = require("node-cron");
const Lead = require("../models/leadModel");
const Inventory = require("../models/inventryModel");
const Notification = require("../models/notification");

// ✅ Convert JS Date → IST string ("YYYY-MM-DD HH:mm:ss")
function formatISTDate(date) {
  const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 hrs
  const ist = new Date(date.getTime() + istOffset);
  return ist.toISOString().replace("T", " ").substring(0, 19);
}

// ✅ Unified follow-up checker (runs every minute)
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    // --- Trigger 1 minute BEFORE follow-up time ---
    const targetStart = new Date(now.getTime() + 30 * 1000); // +30 sec
    const targetEnd = new Date(now.getTime() + 90 * 1000);   // +90 sec

    const startStr = formatISTDate(targetStart);
    const endStr = formatISTDate(targetEnd);

    console.log(` Checking follow-ups (1 min before) between ${startStr} and ${endStr}`);

    // ----------------- LEADS -----------------
    const leads = await Lead.find({
      followUp: { $gte: startStr, $lte: endStr }
    });

    for (const lead of leads) {
      const msg = ` Reminder: Follow up with ${lead.customerName} (${lead.contactNumber}) at ${new Date(lead.followUp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}. Requirement: ${lead.requirement}.`;

      // 🔹 Prevent duplicates created within last 2 mins
      const exists = await Notification.findOne({
        type: "Lead",
        itemId: lead._id,
        message: msg,
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
      });

      if (exists) {
        console.log(` Skipped duplicate lead notification for ${lead.customerName}`);
        continue;
      }

      try {
        await Notification.create({ type: "Lead", itemId: lead._id, message: msg });
        console.log(` Lead notification created for ${lead.customerName}`);

        if (global.io) {
          global.io.emit("followup_notification", {
            type: "Lead",
            leadId: lead._id,
            message: msg,
          });
        }
      } catch (err) {
        if (err.code === 11000) {
          console.log(` Duplicate lead notification blocked by DB: ${lead.customerName}`);
        } else {
          console.error(" Lead notification error:", err);
        }
      }
    }

    // ----------------- INVENTORIES -----------------
    const inventories = await Inventory.find({
      followUpDate: { $gte: startStr, $lte: endStr }
    });

    for (const inv of inventories) {
      const msg = ` Reminder: Follow up with ${inv.sellerName} (${inv.contactNumbers?.[0] || "N/A"}) at ${new Date(inv.followUpDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}. Property in sector ${inv.sector || "N/A"} — Demand: ${inv.demand || "N/A"}.`;

      // 🔹 Prevent duplicates created within last 2 mins
      const exists = await Notification.findOne({
        type: "Inventory",
        itemId: inv._id,
        message: msg,
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
      });

      if (exists) {
        console.log(` Skipped duplicate inventory notification for ${inv.sellerName}`);
        continue;
      }

      try {
        await Notification.create({ type: "Inventory", itemId: inv._id, message: msg });
        console.log(` Inventory notification created for ${inv.sellerName}`);

        if (global.io) {
          global.io.emit("followup_notification", {
            type: "Inventory",
            inventoryId: inv._id,
            message: msg,
          });
        }
      } catch (err) {
        if (err.code === 11000) {
          console.log(` Duplicate inventory notification blocked by DB: ${inv.sellerName}`);
        } else {
          console.error(" Inventory notification error:", err);
        }
      }
    }

    if (!leads.length && !inventories.length) {
      console.log(" No follow-ups this minute.");
    }
  } catch (err) {
    console.error(" followUpCronService error:", err);
  }
});

console.log(" Follow-up cron job initialized (every minute).");


