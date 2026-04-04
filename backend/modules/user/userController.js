const db = require("../../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const emailService = require("../../utils/emailService");
const { OAuth2Client } = require("google-auth-library");

require("dotenv").config({ quiet: true });

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const OTP_EXPIRY_MINUTES = 5;
const isOtpPreviewEnabled = process.env.ALLOW_OTP_PREVIEW === "true";

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const runQuery = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

const hasUsersColumn = async (columnName) => {
  const rows = await runQuery(
    `
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [columnName]
  );

  return rows.length > 0;
};

const getUsersNameColumn = async () => {
  if (await hasUsersColumn("username")) {
    return "username";
  }

  if (await hasUsersColumn("name")) {
    return "name";
  }

  return "username";
};

const normalizeUsername = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const createExpiryDate = () =>
  new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
const EMAIL_SEND_TIMEOUT_MS = 20000;

const isBcryptHash = (value) =>
  typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);

const getUserId = (user) => user?.user_id ?? user?.id;
const getUserName = (user) => user?.name ?? user?.username ?? "";
const getUserEmail = (user) => user?.email ?? "";
const getPasswordValue = (user) => user?.password_hash ?? user?.password ?? "";
const getPasswordColumn = (user) =>
  Object.prototype.hasOwnProperty.call(user, "password_hash") ? "password_hash" : "password";
const getUserIdColumn = (user) =>
  Object.prototype.hasOwnProperty.call(user, "user_id") ? "user_id" : "id";
const isUserVerified = (user) =>
  Object.prototype.hasOwnProperty.call(user, "is_verified") ? Boolean(user.is_verified) : true;
const getRequestUserId = (requestUser) => {
  const candidates = [requestUser?.id, requestUser?.user_id];

  for (const candidate of candidates) {
    const parsedCandidate = Number(candidate);
    if (Number.isInteger(parsedCandidate) && parsedCandidate > 0) {
      return parsedCandidate;
    }
  }

  return null;
};

const createToken = (user) =>
  jwt.sign(
    { id: getUserId(user), name: getUserName(user) },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "1d" }
  );

const toPublicUser = (user) => ({
  id: getUserId(user),
  name: getUserName(user),
  email: getUserEmail(user)
});

const getUserByEmail = async (email) => {
  try {
    const rows = await runQuery("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] || null;
  } catch (error) {
    if (/Unknown column/i.test(error.message)) {
      return null;
    }
    throw error;
  }
};

const sendOtpWithTimeout = async (email, otp) => {
  try {
    const result = await Promise.race([
      emailService.sendOTP(email, otp),
      new Promise((resolve) => {
        setTimeout(() => resolve(false), EMAIL_SEND_TIMEOUT_MS);
      })
    ]);

    return Boolean(result);
  } catch (error) {
    return false;
  }
};

const buildOtpResponse = (message, otp, deliveryConfirmed) => {
  const response = {
    message: deliveryConfirmed
      ? message
      : "OTP was generated, but email delivery could not be confirmed. Check Spam or Promotions, or try again in a moment.",
    deliveryConfirmed: Boolean(deliveryConfirmed)
  };

  if (isOtpPreviewEnabled) {
    response.otpPreview = otp;
    response.otpPreviewMessage = deliveryConfirmed
      ? "Development preview: your OTP is shown here as well."
      : "Email delivery is not fully configured yet, so your OTP is shown here to keep the site working.";
  }

  return response;
};

const insertUser = async ({ name, email, passwordHash, isVerified }) => {
  try {
    return await runQuery(
      "INSERT INTO users (name, email, password_hash, is_verified) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, isVerified ? 1 : 0]
    );
  } catch (error) {
    if (!/Unknown column/i.test(error.message)) {
      throw error;
    }

    return runQuery(
      "INSERT INTO users (name, email, password_hash, is_verified) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, isVerified ? 1 : 0]
    );
  }
};

const buildUsernameBase = (value) => {
  const sanitizedValue = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return (sanitizedValue || "user").slice(0, 80);
};

const buildUniqueUsername = async (seed, suffixSeed = "") => {
  const base = buildUsernameBase(seed);
  const stableSuffix = (suffixSeed.slice(-4).toLowerCase() || "user").replace(
    /[^a-z0-9]+/g,
    ""
  );

  let counter = 0;
  while (true) {
    const suffix =
      counter === 0 ? "" : counter === 1 ? `_${stableSuffix}` : `_${stableSuffix}_${counter}`;
    const candidate = `${base}${suffix}`.slice(0, 100);
    const rows = await runQuery("SELECT 1 FROM users WHERE name = ? LIMIT 1", [candidate]);

    if (rows.length === 0) {
      return candidate;
    }

    counter += 1;
  }
};

exports.checkUsername = async (req, res) => {
  const name = normalizeUsername(req.body?.name);

  if (!name) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const rows = await runQuery(
      "SELECT 1 FROM users WHERE name = ? AND is_verified = 1 LIMIT 1",
      [name]
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

exports.signup = async (req, res) => {
  const name = normalizeUsername(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Username, email, and password are required" });
  }

  try {
    const verifiedEmailRows = await runQuery(
      "SELECT 1 FROM users WHERE email = ? AND is_verified = 1 LIMIT 1",
      [email]
    );

    if (verifiedEmailRows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const verifiedUserRows = await runQuery(
      "SELECT 1 FROM users WHERE name = ? AND is_verified = 1 LIMIT 1",
      [name]
    );

    if (verifiedUserRows.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }

    await runQuery("DELETE FROM otps WHERE email = ?", [email]);
    await runQuery(
      "DELETE FROM users WHERE (email = ? OR name = ?) AND is_verified = 0",
      [email, name]
    );

    const passwordHash = await bcrypt.hash(password, 10);
    await insertUser({ name, email, passwordHash, isVerified: false });

    const otp = generateOTP();
    await runQuery(
      "INSERT INTO otps (email, otp_code, purpose, expires_at) VALUES (?, ?, 'SIGNUP', ?)",
      [email, otp, createExpiryDate()]
    );

    try {
      const delivery = await sendOtpWithTimeout(email, otp);
      if (!delivery) {
        console.error("OTP email send was not confirmed for:", email);
      }

      return res.status(201).json(
        buildOtpResponse(
          "User registered. Please check email for OTP, including Spam or Promotions.",
          otp,
          delivery
        )
      );
    } catch (emailError) {
      console.error("OTP email exception:", emailError.message);
      return res.status(201).json(
        buildOtpResponse(
          "User registered. Please check email for OTP, including Spam or Promotions.",
          otp,
          false
        )
      );
    }
  } catch (error) {
    console.error("signup error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

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

exports.login = async (req, res) => {
  const name = normalizeUsername(req.body?.name);
  const password = req.body?.password;

  if (!name || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const isEmail = name.includes("@");
    const identifier = isEmail ? normalizeEmail(name) : name;
    const nameColumn = await getUsersNameColumn();
    const rows = await runQuery(
      isEmail
        ? "SELECT * FROM users WHERE LOWER(email) = LOWER(?)"
        : `SELECT * FROM users WHERE LOWER(${nameColumn}) = LOWER(?)`,
      [identifier]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Invalid name or password" });
    }

    let matchedUser = null;
    let matchedStoredPassword = "";
    let unverifiedPasswordMatch = false;
    for (const candidateUser of rows) {
      const storedPassword = getPasswordValue(candidateUser);
      const validPassword = isBcryptHash(storedPassword)
        ? await bcrypt.compare(password, storedPassword)
        : password === storedPassword;

      if (!validPassword) {
        continue;
      }

      if (!isUserVerified(candidateUser)) {
        unverifiedPasswordMatch = true;
        continue;
      }

      matchedUser = candidateUser;
      matchedStoredPassword = storedPassword;
      break;
    }

    if (!matchedUser) {
      if (unverifiedPasswordMatch) {
        return res
          .status(403)
          .json({ error: "Account not verified. Please verify your OTP." });
      }
      return res.status(400).json({ error: "Invalid name or password" });
    }

    const user = matchedUser;
    const storedPassword = matchedStoredPassword;

    if (!isBcryptHash(storedPassword)) {
      const upgradedHash = await bcrypt.hash(password, 10);
      const passwordColumn = getPasswordColumn(user);
      const idColumn = getUserIdColumn(user);
      await runQuery(`UPDATE users SET ${passwordColumn} = ? WHERE ${idColumn} = ?`, [
        upgradedHash,
        getUserId(user)
      ]);
      user[passwordColumn] = upgradedHash;
    }

    const token = createToken(user);
    return res.json({
      message: "Login successful",
      token,
      user: toPublicUser(user)
    });
  } catch (error) {
    console.error("login error:", error.message);
    return res.status(500).json({ error: "Database error" });
  }
};

exports.changePassword = async (req, res) => {
  const userId = getRequestUserId(req.user);
  const oldPassword = req.body?.oldPassword;
  const newPassword = req.body?.newPassword;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user session" });
  }

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "Old password and new password are required" });
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters long" });
  }

  if (oldPassword === newPassword) {
    return res
      .status(400)
      .json({ error: "New password must be different from your current password" });
  }

  try {
    const hasUserIdColumn = await hasUsersColumn("user_id");
    const idColumn = hasUserIdColumn ? "user_id" : "id";
    const hasPasswordHashColumn = await hasUsersColumn("password_hash");
    const hasPasswordColumn = await hasUsersColumn("password");

    if (!hasPasswordHashColumn && !hasPasswordColumn) {
      return res.status(500).json({ error: "Password storage is not configured correctly" });
    }

    const selectedColumns = [idColumn];
    if (hasPasswordHashColumn) {
      selectedColumns.push("password_hash");
    }
    if (hasPasswordColumn) {
      selectedColumns.push("password");
    }

    const users = await runQuery(
      `SELECT ${selectedColumns.join(", ")} FROM users WHERE ${idColumn} = ? LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    const storedPassword = getPasswordValue(user);
    if (!storedPassword) {
      return res.status(400).json({ error: "Current password is not set for this account" });
    }

    const isCurrentPasswordValid = isBcryptHash(storedPassword)
      ? await bcrypt.compare(oldPassword, storedPassword)
      : oldPassword === storedPassword;

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: "Old password is incorrect" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updates = [];
    const params = [];

    if (hasPasswordHashColumn) {
      updates.push("password_hash = ?");
      params.push(passwordHash);
    }

    if (hasPasswordColumn) {
      updates.push("password = ?");
      params.push(passwordHash);
    }

    params.push(userId);

    await runQuery(`UPDATE users SET ${updates.join(", ")} WHERE ${idColumn} = ?`, params);

    return res.json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("changePassword error:", error.message);
    return res.status(500).json({ error: "Unable to update password right now" });
  }
};

exports.forgotPassword = async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const otp = generateOTP();
    await runQuery(
      "INSERT INTO otps (email, otp_code, purpose, expires_at) VALUES (?, ?, 'PASSWORD_RESET', ?)",
      [email, otp, createExpiryDate()]
    );

    const delivery = await sendOtpWithTimeout(email, otp);
    if (!delivery) {
      console.error("Password reset OTP email send was not confirmed for:", email);
    }

    return res.json(
      buildOtpResponse(
        "OTP sent to email for password reset. Please check Spam or Promotions too.",
        otp,
        delivery
      )
    );
  } catch (error) {
    console.error("forgotPassword error:", error.message);
    return res.status(500).json({ error: "Failed to generate OTP" });
  }
};

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

    const hasPasswordHashColumn = await hasUsersColumn("password_hash");
    const hasPasswordColumn = await hasUsersColumn("password");
    if (!hasPasswordHashColumn && !hasPasswordColumn) {
      return res.status(500).json({ error: "Password storage is not configured correctly" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updates = [];
    const updateParams = [];

    if (hasPasswordHashColumn) {
      updates.push("password_hash = ?");
      updateParams.push(passwordHash);
    }

    if (hasPasswordColumn) {
      updates.push("password = ?");
      updateParams.push(passwordHash);
    }

    updateParams.push(email);

    await runQuery("DELETE FROM otps WHERE email = ? AND purpose = 'PASSWORD_RESET'", [email]);
    await runQuery(`UPDATE users SET ${updates.join(", ")} WHERE email = ?`, updateParams);

    return res.json({ message: "Password reset successful. You can now login." });
  } catch (error) {
    console.error("resetPassword error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.logout = (req, res) => {
  res.json({ message: "Logged out successfully" });
};

exports.googleLogin = async (req, res) => {
  const credential = req.body?.credential;

  if (!credential) {
    return res.status(400).json({ error: "Google credential is required" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = normalizeEmail(payload?.email);
    const displayName = normalizeUsername(payload?.name) || email.split("@")[0];
    const googleId = payload?.sub || "user";

    if (!email) {
      return res.status(400).json({ error: "Google account email is required" });
    }

    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      if (!existingUser.is_verified) {
        await runQuery(`UPDATE users SET is_verified = 1 WHERE ${getUserIdColumn(existingUser)} = ?`, [
          getUserId(existingUser)
        ]);
        existingUser.is_verified = 1;
      }

      const token = createToken(existingUser);
      return res.json({
        message: "Login successful",
        token,
        user: toPublicUser(existingUser)
      });
    }

    const name = await buildUniqueUsername(displayName, googleId);
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    const result = await insertUser({
      name,
      email,
      passwordHash,
      isVerified: true
    });

    const user = {
      user_id: result.insertId,
      name: name,
      email
    };
    const token = createToken(user);

    return res.json({
      message: "Login successful",
      token,
      user: toPublicUser(user)
    });
  } catch (error) {
    console.error("Google auth error:", error.message);
    return res.status(401).json({ error: "Invalid Google token" });
  }
};

