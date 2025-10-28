
const express = require("express");
const router = express.Router();
const {
  getAllNotifications,
 
} = require("../controllers/notificationController");

// ✅ Routes
router.get("/", getAllNotifications);


module.exports = router;
