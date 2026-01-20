const express = require("express");
const router = express.Router();
const { getCrmSummary } = require("../controllers/summaryController");

// If you want to protect route:
// const { protect } = require("../middleware/authMiddleware");

router.get("/summary", /* protect, */ getCrmSummary);

module.exports = router;
