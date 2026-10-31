// const User = require("../models/user");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");

// // Register user
// exports.register = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     if (!name || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, email and password are required"
//       });
//     }

//     if (password.length < 8) {
//       return res.status(400).json({
//         success: false,
//         message: "Password must be at least 8 characters"
//       });
//     }

//     const normalizedEmail = email.trim().toLowerCase();
//     const existingUser = await User.findOne({ email: normalizedEmail });

//     if (existingUser) {
//       return res.status(409).json({
//         success: false,
//         message: "Email already registered"
//       });
//     }

//     const hashedPassword = await bcrypt.hash(password, 12);

//     const user = await User.create({
//       name: name.trim(),
//       email: normalizedEmail,
//       password: hashedPassword,
//       role: "user"
//     });

//     return res.status(201).json({
//       success: true,
//       message: "User registered successfully",
//       data: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role
//       }
//     });
//   } catch (error) {
//     console.error("Registration error:", error.message);

//     if (error.code === 11000) {
//       return res.status(409).json({
//         success: false,
//         message: "Email already registered"
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Registration failed"
//     });
//   }
// };

// // Login user
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Email and password are required"
//       });
//     }

//     const user = await User.findOne({
//       email: email.trim().toLowerCase()
//     });

//     if (!user || !(await bcrypt.compare(password, user.password))) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password"
//       });
//     }

//     if (!process.env.JWT_SECRET) {
//       return res.status(500).json({
//         success: false,
//         message: "Authentication configuration is missing"
//       });
//     }

//     const token = jwt.sign(
//       { userId: user._id.toString(), role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: "1h" }
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Login successful",
//       token,
//       data: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role
//       }
//     });
//   } catch (error) {
//     console.error("Login error:", error.message);

//     return res.status(500).json({
//       success: false,
//       message: "Login failed"
//     });
//   }
// };
//2

const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register user
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = String(role).trim().toLowerCase();

    if (!["admin", "user"].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role selected",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please sign in.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Authentication configuration is missing",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};
