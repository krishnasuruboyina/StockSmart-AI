
const express = require("express");
const router = express.Router();

const salesController = require("../controllers/salesController");

const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

// All sales routes require a valid JWT token
router.use(authMiddleware);

// Only admins can create sales
router.post("/", adminMiddleware, salesController.createSale);

// Authenticated users can view sales
router.get("/", salesController.getSales);
router.get("/:id", salesController.getSaleById);

module.exports = router;
