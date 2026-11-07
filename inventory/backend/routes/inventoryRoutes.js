const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadInventory,
} = require("../controllers/inventoryController");

const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

// Multer configuration - Store uploaded file in memory
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Maximum 10 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(xlsx|xls|csv)$/i;

    if (!allowedExtensions.test(file.originalname)) {
      return cb(
        new Error("Only XLSX, XLS and CSV files are allowed")
      );
    }

    cb(null, true);
  },
});

// All inventory routes require authentication
router.use(authMiddleware);

// Admin and Employee - View inventory
router.get("/", getProducts);
router.get("/:id", getProductById);

// Admin only - Upload Excel / CSV inventory
router.post(
  "/upload",
  adminMiddleware,
  upload.single("file"),
  uploadInventory
);

// Admin only - Manage inventory
router.post("/", adminMiddleware, createProduct);
router.put("/:id", adminMiddleware, updateProduct);
router.patch("/:id", adminMiddleware, updateProduct);
router.delete("/:id", adminMiddleware, deleteProduct);

module.exports = router;