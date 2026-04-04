const db = require("../../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

require("dotenv").config({ quiet: true });

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY ||
  process.env.REACT_APP_FIREBASE_API_KEY ||
  "AIzaSyDq7gXLTGdezx3SCyjJ1VCeHYF4E4Ce3t4";
const FIREBASE_CONTINUE_URL =
  process.env.FIREBASE_CONTINUE_URL ||
  process.env.FRONTEND_URL ||
  "https://pennywise-frontend-rnxv.onrender.com/login";

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

const isBcryptHash = (value) =>
  typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);

const getUserId = (user) => user?.user_id ?? user?.id;
const getUserName = (user) => user?.name ?? user?.username ?? "";
const getUserEmail = (user) => user?.email ?? "";
const getPasswordColumn = (user) =>
  Object.prototype.hasOwnProperty.call(user, "password_hash") ? "password_hash" : "password";
const getUserIdColumn = (user) =>
  Object.prototype.hasOwnProperty.call(user, "user_id") ? "user_id" : "id";
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

const firebaseRequest = async (endpoint, payload) => {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
  const data = await response.json();

  if (!response.ok) {
    const firebaseMessage = data?.error?.message || "FIREBASE_AUTH_ERROR";
    const error = new Error(firebaseMessage);
    error.code = firebaseMessage;
    throw error;
  }

  return data;
};

const mapFirebaseError = (error, fallbackMessage) => {
  switch (error?.code) {
    case "EMAIL_EXISTS":
      return "Email already exists";
    case "EMAIL_NOT_FOUND":
      return "User not found";
    case "INVALID_LOGIN_CREDENTIALS":
    case "INVALID_PASSWORD":
      return "Invalid email or password";
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return "Too many attempts. Please try again later.";
    case "OPERATION_NOT_ALLOWED":
      return "Email/password sign-in is not enabled in Firebase.";
    default:
      return fallbackMessage;
  }
};

const sendFirebaseActionEmail = async (requestType, email, idToken = null) => {
  const payload = {
    requestType,
    email,
    continueUrl: FIREBASE_CONTINUE_URL
  };

  if (idToken) {
    payload.idToken = idToken;
  }

  return firebaseRequest("accounts:sendOobCode", payload);
};

const getFirebaseAccountInfo = async (idToken) =>
  firebaseRequest("accounts:lookup", { idToken });

const signInWithFirebasePassword = async (email, password) =>
  firebaseRequest("accounts:signInWithPassword", {
    email,
    password,
    returnSecureToken: true
  });

const getIdentifierEmail = async (identifier) => {
  if (identifier.includes("@")) {
    return normalizeEmail(identifier);
  }

  const nameColumn = await getUsersNameColumn();
  const rows = await runQuery(
    `SELECT email FROM users WHERE LOWER(${nameColumn}) = LOWER(?) LIMIT 1`,
    [identifier]
  );

  return rows[0]?.email ? normalizeEmail(rows[0].email) : "";
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

    await runQuery(
      "DELETE FROM users WHERE (email = ? OR name = ?) AND is_verified = 0",
      [email, name]
    );

    const passwordHash = await bcrypt.hash(password, 10);
    const firebaseUser = await firebaseRequest("accounts:signUp", {
      email,
      password,
      returnSecureToken: true
    });

    await sendFirebaseActionEmail("VERIFY_EMAIL", email, firebaseUser.idToken);
    await insertUser({ name, email, passwordHash, isVerified: false });

    return res.status(201).json({
      message: "Account created. Please check your email and click the verification link before logging in."
    });
  } catch (error) {
    console.error("signup error:", error.message);
    return res.status(400).json({ error: mapFirebaseError(error, "Unable to create account") });
  }
};

exports.verifyOtp = async (req, res) => {
  return res.status(410).json({
    error: "OTP verification has been replaced. Please use the verification link sent to your email."
  });
};

exports.login = async (req, res) => {
  const name = normalizeUsername(req.body?.name);
  const password = req.body?.password;

  if (!name || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const email = await getIdentifierEmail(name);

    if (!email) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const signInResult = await signInWithFirebasePassword(email, password);
    const accountInfo = await getFirebaseAccountInfo(signInResult.idToken);
    const firebaseUser = accountInfo?.users?.[0];

    if (!firebaseUser?.emailVerified) {
      return res.status(403).json({
        error: "Email not verified. Please check your inbox and click the verification link."
      });
    }

    let user = await getUserByEmail(email);
    const passwordHash = await bcrypt.hash(password, 10);

    if (!user) {
      const derivedName = await buildUniqueUsername(
        firebaseUser.displayName || email.split("@")[0],
        firebaseUser.localId || email
      );
      const insertResult = await insertUser({
        name: derivedName,
        email,
        passwordHash,
        isVerified: true
      });
      user = { user_id: insertResult.insertId, name: derivedName, email, is_verified: 1 };
    } else {
      const passwordColumn = getPasswordColumn(user);
      const idColumn = getUserIdColumn(user);
      await runQuery(
        `UPDATE users SET is_verified = 1, ${passwordColumn} = ? WHERE ${idColumn} = ?`,
        [passwordHash, getUserId(user)]
      );
      user.is_verified = 1;
      user[passwordColumn] = passwordHash;
    }

    const token = createToken(user);
    return res.json({
      message: "Login successful",
      token,
      user: toPublicUser(user)
    });
  } catch (error) {
    console.error("login error:", error.message);
    return res.status(400).json({ error: mapFirebaseError(error, "Unable to sign in") });
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
    const users = await runQuery(`SELECT * FROM users WHERE ${idColumn} = ? LIMIT 1`, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    const email = normalizeEmail(user.email);
    if (!email) {
      return res.status(400).json({ error: "User email is missing" });
    }

    const signInResult = await signInWithFirebasePassword(email, oldPassword);
    await firebaseRequest("accounts:update", {
      idToken: signInResult.idToken,
      password: newPassword,
      returnSecureToken: false
    });

    const hasPasswordHashColumn = await hasUsersColumn("password_hash");
    const hasPasswordColumn = await hasUsersColumn("password");

    if (!hasPasswordHashColumn && !hasPasswordColumn) {
      return res.status(500).json({ error: "Password storage is not configured correctly" });
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
    return res.status(400).json({ error: mapFirebaseError(error, "Unable to update password right now") });
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

    await sendFirebaseActionEmail("PASSWORD_RESET", email);
    return res.json({
      message: "Password reset email sent. Please check your inbox and follow the link."
    });
  } catch (error) {
    console.error("forgotPassword error:", error.message);
    return res.status(400).json({ error: mapFirebaseError(error, "Failed to send password reset email") });
  }
};

exports.resetPassword = async (req, res) => {
  return res.status(410).json({
    error: "Password reset now uses an email link. Please use the link sent to your inbox."
  });
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

