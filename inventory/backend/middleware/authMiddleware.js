
const jwt = require("jsonwebtoken");

// Verify JWT token
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing.");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration is missing.",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token required.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    console.log("Authentication successful:", {
      userId: decoded.userId,
      role: decoded.role,
      method: req.method,
      path: req.originalUrl,
    });

    return next();
  } catch (error) {
    console.error("Authentication failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

// Verify admin role
const adminMiddleware = (req, res, next) => {
  console.log("ADMIN MIDDLEWARE HIT:", {
    userId: req.user?.userId,
    role: req.user?.role,
    method: req.method,
    path: req.originalUrl,
  });

if (!req.user || String(req.user.role).toLowerCase() !== "admin") {
      console.log("ACCESS DENIED: Admin role required");

    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  console.log("ADMIN ACCESS GRANTED");
  return next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
};
