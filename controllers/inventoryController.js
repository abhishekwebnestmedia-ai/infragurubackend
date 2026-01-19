const Inventory = require("../models/Inventory");

// CREATE Inventory
exports.createInventory = async (req, res) => {
  try {
    const inventory = await Inventory.create(req.body);
    return res.status(201).json({
      success: true,
      message: "Inventory created successfully",
      data: inventory,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// GET All Inventory (with filters + pagination)
exports.getInventories = async (req, res) => {
  try {
    const { status, type, city, projectName, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (city) query["location.city"] = city;
    if (projectName) query.projectName = projectName;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { propertyCode: { $regex: search, $options: "i" } },
        { projectName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Inventory.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Inventory.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Inventory fetched successfully",
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: items,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// GET Single Inventory by ID
exports.getInventoryById = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory fetched successfully",
      data: item,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Invalid Inventory ID",
    });
  }
};

// UPDATE Inventory
exports.updateInventory = async (req, res) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// DELETE Inventory
exports.deleteInventory = async (req, res) => {
  try {
    const deleted = await Inventory.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory deleted successfully",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Invalid Inventory ID",
    });
  }
};
