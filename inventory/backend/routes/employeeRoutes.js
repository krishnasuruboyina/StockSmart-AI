const express = require("express");
const router = express.Router();

const employeeController = require("../controllers/employeeController");

const { authMiddleware } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// All employee routes require authentication
router.use(authMiddleware);

// Only Admin can manage employees
router.use(authorizeRoles("admin"));

// Get all employees belonging to Admin's company
router.get("/", employeeController.getEmployees);

// Create a new employee
router.post("/", employeeController.createEmployee);

// Update employee details
router.put("/:id", employeeController.updateEmployee);

// Delete (deactivate) employee
router.delete("/:id", employeeController.deleteEmployee);

module.exports = router;