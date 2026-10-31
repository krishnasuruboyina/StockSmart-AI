
const express = require("express");
const router = express.Router();

const supplierController = require("../controllers/supplierController");

const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

// All supplier routes require a valid JWT token
router.use(authMiddleware);

// Authenticated users can view suppliers
router.get("/", supplierController.getSuppliers);
router.get("/:id", supplierController.getSupplierById);

// Only admins can modify suppliers
router.post("/", adminMiddleware, supplierController.createSupplier);
router.put("/:id", adminMiddleware, supplierController.updateSupplier);
router.patch("/:id", adminMiddleware, supplierController.updateSupplier);
router.delete("/:id", adminMiddleware, supplierController.deleteSupplier);

module.exports = router;
