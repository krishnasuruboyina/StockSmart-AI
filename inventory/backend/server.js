const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// 1. Validate environment variables
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing in .env");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env");
  process.exit(1);
}

// 2. CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "https://stocksmart-ai-txhd.onrender.com/",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  })
);

// 3. Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Inventory AI Backend is running!",
  });
});

// 5. Authentication routes
app.use("/api/auth", require("./routes/authRoutes"));

// 6. Inventory routes (includes Excel/CSV upload)
app.use("/api/inventory", require("./routes/inventoryRoutes"));

// 7. Supplier routes
app.use("/api/suppliers", require("./routes/supplierRoutes"));

// 8. Sales routes
app.use("/api/sales", require("./routes/salesRoutes"));

// 9. Dashboard routes
app.use("/api/dashboard", require("./routes/dashboardRoutes"));

// 10. Forecast routes
app.use("/api/forecast", require("./routes/forecastRoutes"));

// 11. Reorder routes
app.use("/api/reorder", require("./routes/reorderRoutes"));

// 12. Upload routes
app.use("/api/upload", require("./routes/uploadRoutes"));

// 13. Purchase request routes
app.use(
  "/api/purchase-requests",
  require("./routes/purchaseRequestRoutes")
);

// 14. Company routes
app.use("/api/companies", require("./routes/companyRoutes"));

// 15. Employee routes
app.use("/api/employees", require("./routes/employeeRoutes"));

// 16. Purchase order routes
app.use(
  "/api/purchase-orders",
  require("./routes/purchaseOrderRoutes")
);

// 17. Delivery routes
app.use("/api/deliveries", require("./routes/deliveryRoutes"));

// 18. Notification routes
app.use("/api/notifications", require("./routes/notificationRoutes"));

// 19. 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// 20. Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  // Invalid JSON request
  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    "body" in err
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
    });
  }

  // Request body too large
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large",
    });
  }

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "File is too large. Maximum allowed size is 10MB.",
    });
  }

  // Other Multer errors
  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // CORS error
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS error: Origin not allowed",
    });
  }

  const statusCode =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status <= 599
      ? err.status
      : 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode < 500
        ? err.message
        : "Internal server error",
  });
});

// 21. Connect MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  });

module.exports = app;
