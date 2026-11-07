const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check whether user is authenticated.
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Check whether user account is active.
      if (req.user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: "Your account is inactive. Contact your administrator.",
        });
      }

      // Check user role permission.
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Role authorization failed",
      });
    }
  };
};

module.exports = authorizeRoles;