const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  createProject,
  getAllProjects,
  // getProjectById,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");

// ✅ Multer setup for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // folder to store images
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ✅ Routes
router.post("/create", upload.single("thumbnail"), createProject);
router.get("/", getAllProjects);
// router.get("/:id", getProjectById);
router.put("/:id", upload.single("thumbnail"), updateProject);
router.delete("/:id", deleteProject);

module.exports = router;






