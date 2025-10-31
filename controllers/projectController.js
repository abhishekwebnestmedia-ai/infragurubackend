const Project = require("../models/project");
const path = require("path");
const fs = require("fs").promises;

// ✅ Create New Project
exports.createProject = async (req, res) => {
  try {
    const { projectName, pdfLink, developerName, status } = req.body;
    let thumbnail = "";

    if (req.file) {
      thumbnail = `/uploads/${req.file.filename}`;
    }

    if (!projectName || !developerName) {
      return res
        .status(400)
        .json({ message: "Project name and developer name are required" });
    }

    const project = await Project.create({
      projectName,
      pdfLink,
      developerName,
      status,
      thumbnail,
    });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating project",
      error: error.message,
    });
  }
};

// ✅ Get All Projects
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get Single Project
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Project not found" });
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update Project
exports.updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { projectName, pdfLink, developerName, status } = req.body;

    const project = await Project.findById(projectId);
    if (!project)
      return res.status(404).json({ success: false, message: "Project not found" });

    // Handle new thumbnail upload
    if (req.file) {
      const newThumbnailPath = `/uploads/${req.file.filename}`;

      // Delete old thumbnail if exists locally
      if (project.thumbnail && project.thumbnail.startsWith("/uploads/")) {
        try {
          const oldFilename = project.thumbnail.replace(/^\/uploads\//, "");
          const oldFilePath = path.join(process.cwd(), "uploads", oldFilename);
          await fs.unlink(oldFilePath).catch((err) => {
            if (err.code !== "ENOENT") console.warn("Old thumbnail delete failed:", err);
          });
        } catch (delErr) {
          console.warn("Error deleting old thumbnail:", delErr);
        }
      }

      project.thumbnail = newThumbnailPath;
    }

    // Update provided fields
    if (projectName !== undefined) project.projectName = projectName;
    if (pdfLink !== undefined) project.pdfLink = pdfLink;
    if (developerName !== undefined) project.developerName = developerName;
    if (status !== undefined) project.status = status;

    const updatedProject = await project.save();

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating project",
      error: error.message,
    });
  }
};

// ✅ Delete Project
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Project not found" });

    // Remove thumbnail file if it exists
    if (project.thumbnail && project.thumbnail.startsWith("/uploads/")) {
      try {
        const oldFilename = project.thumbnail.replace(/^\/uploads\//, "");
        const oldFilePath = path.join(process.cwd(), "uploads", oldFilename);
        await fs.unlink(oldFilePath).catch((err) => {
          if (err.code !== "ENOENT") console.warn("Thumbnail delete failed:", err);
        });
      } catch (delErr) {
        console.warn("Error deleting thumbnail:", delErr);
      }
    }

    await Project.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
