
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// 1. Validate required environment variables
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing in .env");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env");
  process.exit(1);
}

// 2. Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.use(express.json({ limit: "10mb" }));

// 3. Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Inventory AI Backend is running!",
  });
});

// 4. API Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/suppliers", require("./routes/supplierRoutes"));
app.use("/api/sales", require("./routes/salesRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/forecast", require("./routes/forecastRoutes"));
app.use("/api/reorder", require("./routes/reorderRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));

app.use(
  "/api/purchase-requests",
  require("./routes/purchaseRequestRoutes")
);

// 5. 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// 6. Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  // Invalid JSON request
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
    });
  }

  // Request body exceeds configured limit
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large",
    });
  }

  const statusCode =
    Number.isInteger(err.status) && err.status >= 400 && err.status <= 599
      ? err.status
      : 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode < 500 ? err.message : "Internal server error",
  });
});

// 7. Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
