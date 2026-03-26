const db = require("../../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const emailService = require("../../utils/emailService");
const { OAuth2Client } = require("google-auth-library");

require("dotenv").config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const OTP_EXPIRY_MINUTES = 15;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const runQuery = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

const normalizeUsername = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const createExpiryDate = () =>
  new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

const createToken = (user) =>
  jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "1d" }
  );

const toPublicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
});

// Check if username is already taken
exports.checkUsername = async (req, res) => {
  const username = normalizeUsername(req.body?.username);

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const rows = await runQuery(
      "SELECT 1 FROM users WHERE username = ? AND is_verified = 1 LIMIT 1",
      [username]
    );

    if (rows.length > 0) {
      return res.json({ available: false, message: "Username already taken" });
    }

    return res.json({ available: true, message: "Username is available" });
  } catch (error) {
    console.error("checkUsername error:", error.message);
    return res.status(500).json({ error: "Database error" });
  }
};

// Signup
exports.signup = async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ error: "Username, email, and password are required" });
  }

  try {
    // Check if email is used by a verified user
    const verifiedEmailRows = await runQuery(
      "SELECT 1 FROM users WHERE email = ? AND is_verified = 1 LIMIT 1",
      [email]
    );

    if (verifiedEmailRows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Check if username is used by a verified user
    const verifiedUserRows = await runQuery(
      "SELECT 1 FROM users WHERE username = ? AND is_verified = 1 LIMIT 1",
      [username]
    );

    if (verifiedUserRows.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Clean up old unverified data
    await runQuery("DELETE FROM otps WHERE email = ?", [email]);
    await runQuery(
      "DELETE FROM users WHERE (email = ? OR username = ?) AND is_verified = 0",
      [email, username]
    );

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    await runQuery(
      "INSERT INTO users (username, email, password_hash, is_verified) VALUES (?, ?, ?, 0)",
      [username, email, passwordHash]
    );

    // Generate and store OTP
    const otp = generateOTP();
    await runQuery(
      "INSERT INTO otps (email, otp_code, purpose, expires_at) VALUES (?, ?, 'SIGNUP', ?)",
      [email, otp, createExpiryDate()]
    );

    // Send OTP email
    try {
      const sent = await emailService.sendOTP(email, otp);
      if (sent) {
        return res
          .status(201)
          .json({ message: "User registered. Please check email for OTP." });
      }

      console.error("OTP email send failed for:", email);
      return res
        .status(201)
        .json({ message: "User registered but email failed. Contact support." });
    } catch (emailError) {
      console.error("OTP email exception:", emailError.message);
      return res
        .status(201)
        .json({ message: "User registered but email failed. Contact support." });
    }
  } catch (error) {
    console.error("signup error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otpCode = normalizeUsername(req.body?.otpCode);

  if (!email || !otpCode) {
    return res.status(400).json({ error: "Email and OTP code are required" });
  }

  try {
    const rows = await runQuery(
      "SELECT otp_id, purpose FROM otps WHERE email = ? AND otp_code = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
      [email, otpCode, new Date()]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Delete used OTP
    await runQuery("DELETE FROM otps WHERE otp_id = ?", [rows[0].otp_id]);

    if (rows[0].purpose === "SIGNUP") {
      await runQuery("UPDATE users SET is_verified = 1 WHERE email = ?", [email]);
      return res.json({ message: "User verified successfully. You can now login." });
    }

    return res.json({ message: "OTP verified. Proceed to next step." });
  } catch (error) {
    console.error("verifyOtp error:", error.message);
    return res.status(500).json({ error: "Database error" });
  }
};

// Login
exports.login = async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = req.body?.password;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const isEmail = username.includes("@");
    const identifier = isEmail ? normalizeEmail(username) : username;

    const rows = await runQuery(
      isEmail
        ? "SELECT * FROM users WHERE LOWER(email) = LOWER(?)"
        : "SELECT * FROM users WHERE LOWER(username) = LOWER(?)",
      [identifier]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const user = rows[0];

    // Check verification status
    if (!user.is_verified) {
      return res
        .status(403)
        .json({ error: "Account not verified. Please verify your OTP." });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const token = createToken(user);
    return res.json({
      message: "Login successful",
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error("login error:", error.message);
    return res.status(500).json({ error: "Database error" });
  }
};

// Forgot Password — request OTP
exports.forgotPassword = async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const rows = await runQuery(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const otp = generateOTP();
    await runQuery(
      "INSERT INTO otps (email, otp_code, purpose, expires_at) VALUES (?, ?, 'PASSWORD_RESET', ?)",
      [email, otp, createExpiryDate()]
    );

    try {
      const sent = await emailService.sendOTP(email, otp);
      if (sent) {
        return res.json({ message: "OTP sent to email for password reset." });
      }
      console.error("Password reset OTP email failed for:", email);
      return res.json({ message: "OTP generated. Check console if email not received." });
    } catch (emailError) {
      console.error("Password reset email exception:", emailError.message);
      return res.json({ message: "OTP generated. Check console if email not received." });
    }
  } catch (error) {
    console.error("forgotPassword error:", error.message);
    return res.status(500).json({ error: "Failed to generate OTP" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otpCode = normalizeUsername(req.body?.otpCode);
  const newPassword = req.body?.newPassword;

  if (!email || !otpCode || !newPassword) {
    return res
      .status(400)
      .json({ error: "Email, OTP code, and new password are required" });
  }

  try {
    const rows = await runQuery(
      "SELECT otp_id FROM otps WHERE email = ? AND otp_code = ? AND purpose = 'PASSWORD_RESET' AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
      [email, otpCode, new Date()]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await runQuery("DELETE FROM otps WHERE email = ? AND purpose = 'PASSWORD_RESET'", [email]);
    await runQuery("UPDATE users SET password_hash = ? WHERE email = ?", [
      passwordHash,
      email,
    ]);

    return res.json({ message: "Password reset successful. You can now login." });
  } catch (error) {
    console.error("resetPassword error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

// Logout
exports.logout = (req, res) => {
  res.json({ message: "Logged out successfully" });
};

// Google Sign-In
exports.googleLogin = async (req, res) => {
  const credential = req.body?.credential;

  if (!credential) {
    return res.status(400).json({ error: "Google credential is required" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = normalizeEmail(payload?.email);
    const displayName = normalizeUsername(payload?.name) || email.split("@")[0];
    const googleId = payload?.sub || "user";

    if (!email) {
      return res.status(400).json({ error: "Google account email is required" });
    }

    // Check if user already exists
    const existingRows = await runQuery(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingRows.length > 0) {
      const existingUser = existingRows[0];

      // Auto-verify Google users
      if (!existingUser.is_verified) {
        await runQuery("UPDATE users SET is_verified = 1 WHERE id = ?", [
          existingUser.id,
        ]);
        existingUser.is_verified = 1;
      }

      const token = createToken(existingUser);
      return res.json({
        message: "Login successful",
        token,
        user: toPublicUser(existingUser),
      });
    }

    // New user — build a unique username
    const baseUsername = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "user";
    const suffix = googleId.slice(-4);
    let username = `${baseUsername}_${suffix}`;

    // Ensure unique
    const dupes = await runQuery(
      "SELECT 1 FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    if (dupes.length > 0) {
      username = `${baseUsername}_${suffix}_${Date.now() % 10000}`;
    }

    const randomPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const result = await runQuery(
      "INSERT INTO users (username, email, password_hash, is_verified) VALUES (?, ?, ?, 1)",
      [username, email, passwordHash]
    );

    const newUser = { id: result.insertId, username, email };
    const token = createToken(newUser);

    return res.json({
      message: "Login successful",
      token,
      user: toPublicUser(newUser),
    });
  } catch (error) {
    console.error("Google auth error:", error.message);
    return res.status(401).json({ error: "Invalid Google token" });
  }
};
