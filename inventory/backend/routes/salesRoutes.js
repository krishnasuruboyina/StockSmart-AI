const express = require("express");
const multer = require("multer");
const router = express.Router();

const salesController = require("../controllers/salesController");

const {
  authMiddleware,
} = require("../middleware/authMiddleware");

const authorizeRoles = require("../middleware/roleMiddleware");

// Multer memory storage for Excel/CSV uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, callback) => {
    const allowedExtensions = [".xlsx", ".xls", ".csv"];

    const extension = file.originalname
      .substring(file.originalname.lastIndexOf("."))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return callback(
        new Error("Only Excel and CSV files are allowed.")
      );
    }

    callback(null, true);
  },
});

// All sales routes require authentication
router.use(authMiddleware);

// Historical sales upload - Admin only
router.post(
  "/history/upload",
  authorizeRoles("admin"),
  upload.single("file"),
  salesController.uploadHistoricalSales
);

// Admin and Employee can create sales
router.post(
  "/",
  authorizeRoles("admin", "employee"),
  salesController.createSale
);

// Admin and Employee can view company sales
router.get(
  "/",
  authorizeRoles("admin", "employee"),
  salesController.getSales
);

// Get individual sale
router.get(
  "/:id",
  authorizeRoles("admin", "employee"),
  salesController.getSaleById
);

module.exports = router;