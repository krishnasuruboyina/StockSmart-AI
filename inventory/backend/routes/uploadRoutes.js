
const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const uploadController = require("../controllers/uploadController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Configure file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Maximum 5 MB
    files: 1, // Only one file per request
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if ([".csv", ".xlsx"].includes(ext)) {
      return cb(null, true);
    }

    const error = new Error("Only CSV and .xlsx files are allowed");
    error.status = 400;

    return cb(error);
  },
});

// Upload inventory file
router.post(
  "/",
  authMiddleware,
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        const isMulterError = error instanceof multer.MulterError;

        if (isMulterError) {
          const message =
            error.code === "LIMIT_FILE_SIZE"
              ? "File size must not exceed 5 MB"
              : error.code === "LIMIT_FILE_COUNT"
                ? "Only one file is allowed"
                : "Invalid file upload";

          return res.status(400).json({
            success: false,
            message,
          });
        }

        return res.status(error.status || 400).json({
          success: false,
          message: error.message || "File upload failed",
        });
      }

      next();
    });
  },
  uploadController.uploadInventoryFile
);

module.exports = router;
