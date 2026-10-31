
const express = require("express");
const router = express.Router();

const {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/inventoryController");

const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

// All inventory routes require a valid JWT token
router.use(authMiddleware);

// Any authenticated user can view products
router.get("/", getProducts);
router.get("/:id", getProductById);

// Only admins can modify inventory
router.post("/", adminMiddleware, createProduct);
router.put("/:id", adminMiddleware, updateProduct);
router.patch("/:id", adminMiddleware, updateProduct);
router.delete("/:id", adminMiddleware, deleteProduct);

module.exports = router;
