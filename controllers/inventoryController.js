const Inventory = require("../models/Inventory");
const xlsx = require("xlsx");
const csv = require("csv-parser");
const fs = require("fs");

// ----------------------- CRUD -----------------------

// CREATE Inventory
exports.createInventory = async (req, res) => {
  try {
    const inventory = await Inventory.create({
      ...req.body,
      createdBy: req.user?.id,
    });

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

// GET All Inventory
exports.getInventories = async (req, res) => {
  try {
    const { status, type, city, projectName, search, page = 1, limit = 10 } =
      req.query;

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

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      Inventory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Inventory.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Inventory fetched successfully",
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
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

// GET Single Inventory
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

// ----------------------- BULK UPLOAD -----------------------

const parseCSVFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
};

const parseExcelFile = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { defval: "" });
};

const mapRowToInventory = (row) => {
  return {
    propertyCode: String(row.propertyCode || row.PropertyCode || row.code || "")
      .trim()
      .toUpperCase(),

    title: String(row.title || row.Title || "").trim(),

    type: String(row.type || row.Type || "flat").toLowerCase(),

    projectName: String(row.projectName || row.ProjectName || "").trim(),

    location: {
      address: String(row.address || row.Address || "").trim(),
      city: String(row.city || row.City || "").trim(),
      state: String(row.state || row.State || "").trim(),
      pincode: String(row.pincode || row.Pincode || "").trim(),
      landmark: String(row.landmark || row.Landmark || "").trim(),
    },

    unitDetails: {
      bhk: String(row.bhk || row.BHK || "").trim(),
      size: row.size ? Number(row.size) : undefined,
      sizeUnit: String(row.sizeUnit || row.SizeUnit || "sqft").toLowerCase(),
      floor: row.floor ? Number(row.floor) : undefined,
      totalFloors: row.totalFloors ? Number(row.totalFloors) : undefined,
      facing: String(row.facing || row.Facing || "").trim(),
    },

    pricing: {
      price: Number(row.price || row.Price || 0),
      currency: String(row.currency || row.Currency || "INR").trim(),
      negotiable:
        String(row.negotiable || row.Negotiable || "false").toLowerCase() ===
        "true",
    },

    status: String(row.status || row.Status || "available").toLowerCase(),

    ownerName: String(row.ownerName || row.OwnerName || "").trim(),
    ownerPhone: String(row.ownerPhone || row.OwnerPhone || "").trim(),

    description: String(row.description || row.Description || "").trim(),

    images: row.images
      ? String(row.images)
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      : [],
  };
};

// ✅ Bulk upload endpoint
exports.bulkUploadInventory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required (CSV/XLSX/XLS)",
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname.toLowerCase();

    let rows = [];

    if (fileName.endsWith(".csv")) {
      rows = await parseCSVFile(filePath);
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      rows = await parseExcelFile(filePath);
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: "Only CSV/XLSX/XLS supported",
      });
    }

    if (!rows.length) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: "File is empty",
      });
    }

    const inventories = [];
    const failedRows = [];

    rows.forEach((row, index) => {
      const inv = mapRowToInventory(row);

      if (!inv.propertyCode || !inv.title || !inv.pricing?.price) {
        failedRows.push({
          rowNumber: index + 2,
          message: "Missing required fields: propertyCode/title/price",
          row,
        });
      } else {
        inv.createdBy = req.user?.id;
        inventories.push(inv);
      }
    });

    // Insert many (continue even if duplicate)
    let inserted = [];
    if (inventories.length) {
      inserted = await Inventory.insertMany(inventories, { ordered: false });
    }

    // ✅ remove uploaded file after parsing
    fs.unlinkSync(filePath);

    return res.status(201).json({
      success: true,
      message: "Bulk upload completed",
      totalRows: rows.length,
      insertedCount: inserted.length,
      failedCount: failedRows.length,
      failedRows: failedRows.slice(0, 20),
    });
  } catch (err) {
    // if file exists then delete
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
