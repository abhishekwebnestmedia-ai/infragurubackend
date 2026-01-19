const express = require("express");
const router = express.Router();

const {
  createInventory,
  getInventories,
  getInventoryById,
  updateInventory,
  deleteInventory,
} = require("../controllers/inventoryController");

// CRUD Routes
router.post("/", createInventory);          // Create
router.get("/", getInventories);            // List + filters
router.get("/:id", getInventoryById);       // Single
router.put("/:id", updateInventory);        // Update
router.delete("/:id", deleteInventory);     // Delete

module.exports = router;
