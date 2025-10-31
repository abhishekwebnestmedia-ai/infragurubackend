const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const { upload } = require("../middleware/upload");
const { createBroadcast, getGroupBroadcasts } = require("../controllers/broadcastController");

router.post("/", authMiddleware, upload.single("attachment"), createBroadcast);
router.get("/:groupId", authMiddleware, getGroupBroadcasts); 

module.exports = router;
