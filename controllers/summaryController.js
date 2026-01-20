const Lead = require("../models/leadModel");
const Inventory = require("../models/Inventory");

exports.getCrmSummary = async (req, res) => {
  try {
    // ✅ Lead Statuses (same as your Lead model)
    const validLeadStatuses = [
      "Follow Ups",
      "Not Connected",
      "Prospect",
      "Closer",
    ];

    // ✅ Inventory Statuses (same as Inventory model)
    const validInventoryStatuses = ["available", "booked", "sold", "hold"];

    // ✅ Inventory Types (same as Inventory model)
    const validInventoryTypes = [
      "flat",
      "villa",
      "plot",
      "commercial",
      "office",
      "shop",
      "other",
    ];

    // -------------------- TOTAL COUNTS --------------------
    const [totalLeads, totalInventory] = await Promise.all([
      Lead.countDocuments({}),
      Inventory.countDocuments({}),
    ]);

    // -------------------- LEAD STATUS COUNTS --------------------
    const leadAgg = await Lead.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const leadStatusCounts = {};
    validLeadStatuses.forEach((s) => (leadStatusCounts[s] = 0));

    leadAgg.forEach((row) => {
      if (row._id) leadStatusCounts[row._id] = row.count;
    });

    // -------------------- INVENTORY STATUS COUNTS --------------------
    const invStatusAgg = await Inventory.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const inventoryStatusCounts = {};
    validInventoryStatuses.forEach((s) => (inventoryStatusCounts[s] = 0));

    invStatusAgg.forEach((row) => {
      if (row._id) inventoryStatusCounts[row._id] = row.count;
    });

    // -------------------- INVENTORY TYPE COUNTS --------------------
    const invTypeAgg = await Inventory.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    const inventoryTypeCounts = {};
    validInventoryTypes.forEach((t) => (inventoryTypeCounts[t] = 0));

    invTypeAgg.forEach((row) => {
      if (row._id) inventoryTypeCounts[row._id] = row.count;
    });

    // ✅ FINAL RESPONSE
    return res.status(200).json({
      success: true,
      message: "CRM summary fetched successfully",
      data: {
        totals: {
          leads: totalLeads,
          inventory: totalInventory,
          overall: totalLeads + totalInventory,
        },

        leads: {
          total: totalLeads,
          statusBreakdown: leadStatusCounts,
        },

        inventory: {
          total: totalInventory,
          statusBreakdown: inventoryStatusCounts,
          typeBreakdown: inventoryTypeCounts,
        },
      },
    });
  } catch (err) {
    console.error("❌ getCrmSummary error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching CRM summary",
      error: err.message,
    });
  }
};
