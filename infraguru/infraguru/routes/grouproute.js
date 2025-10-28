const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const { createGroup, getAllGroups } = require("../controllers/groupController");

router.post("/", authMiddleware, createGroup);
router.get("/", authMiddleware, getAllGroups);

module.exports = router;
