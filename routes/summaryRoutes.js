const express = require("express");
const router = express.Router();
const { getCrmSummary } = require("../controllers/summaryController");
const authMiddleware = require("../middleware/authmiddleware");

// If you want to protect route:
// const { protect } = require("../middleware/authMiddleware");

router.get("/summary",authMiddleware , getCrmSummary);

module.exports = router;
