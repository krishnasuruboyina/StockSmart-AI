const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected route - Get logged-in user
router.get("/me", authMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        company: req.user.company,
        employeeId: req.user.employeeId,
        supplierId: req.user.supplierId,
      },
    },
  });
});

module.exports = router;