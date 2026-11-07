const express = require("express");
const router = express.Router();

const supplierController = require("../controllers/supplierController");

const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

// All supplier routes require authentication
router.use(authMiddleware);

// Admin only - View company suppliers
router.get("/", adminMiddleware, supplierController.getSuppliers);

// Admin only - Manage suppliers
router.post("/", adminMiddleware, supplierController.createSupplier);
router.put("/:id", adminMiddleware, supplierController.updateSupplier);
router.patch("/:id", adminMiddleware, supplierController.updateSupplier);
router.delete("/:id", adminMiddleware, supplierController.deleteSupplier);

module.exports = router;