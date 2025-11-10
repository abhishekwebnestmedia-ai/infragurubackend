const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const { createGroup, getAllGroups, updateGroup } = require("../controllers/groupController");

router.post("/", authMiddleware, createGroup);
router.get("/", authMiddleware, getAllGroups);
router.put("/:groupId", authMiddleware, updateGroup);

module.exports = router;

