const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authmiddleware");
const { upload } = require("../middleware/upload");

const {
  createInventory,
  getInventories,
  getInventoryById,
  updateInventory,
  deleteInventory,
  bulkUploadInventory,
} = require("../controllers/inventoryController");

// ✅ PUBLIC
router.get("/", authMiddleware,getInventories);
router.get("/:id", authMiddleware,getInventoryById);

// ✅ PROTECTED CRUD
router.post("/", authMiddleware, createInventory);
router.put("/:id", authMiddleware, updateInventory);
router.delete("/:id", authMiddleware, deleteInventory);

// ✅ BULK UPLOAD (CSV/XLSX/XLS)
router.post(
  "/bulk-upload",
  authMiddleware,
  upload.single("file"),
  bulkUploadInventory
);

module.exports = router;
