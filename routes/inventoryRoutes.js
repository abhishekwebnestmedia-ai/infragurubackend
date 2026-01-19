const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");

const {
  createInventory,
  getInventories,
  getInventoryById,
  updateInventory,
  deleteInventory,
} = require("../controllers/inventoryController");

// PUBLIC routes
router.get("/",authMiddleware, getInventories);
router.get("/:id",authMiddleware, getInventoryById);

// PROTECTED routes
router.post("/", authMiddleware, createInventory);
router.put("/:id", authMiddleware, updateInventory);
router.delete("/:id", authMiddleware, deleteInventory);

module.exports = router;





