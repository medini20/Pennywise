const db = require("../../config/db");
const jwt = require("jsonwebtoken");

const runQuery = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");
const UNKNOWN_COLUMN_REGEX = /Unknown column/i;
const JWT_SECRET = process.env.JWT_SECRET || "secret";

const extractRequestUserId = (user = {}) => {
  const candidates = [user.id, user.user_id];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const runFirstCompatibleQuery = async (queries) => {
  for (const query of queries) {
    try {
      return await runQuery(query.sql, query.params);
    } catch (error) {
      if (!UNKNOWN_COLUMN_REGEX.test(error.message)) {
        throw error;
      }
    }
  }

  throw new Error("Unsupported users table schema");
};

const findProfileConflict = async ({ userId, name, email }) => {
  const rows = await runFirstCompatibleQuery([
    {
      sql: `
        SELECT user_id AS conflict_user_id
        FROM users
        WHERE user_id <> ?
          AND (
            LOWER(name) = LOWER(?)
            OR LOWER(name) = LOWER(?)
            OR LOWER(email) = LOWER(?)
          )
        LIMIT 1
      `,
      params: [userId, name, name, email]
    },
    {
      sql: `
        SELECT user_id AS conflict_user_id
        FROM users
        WHERE user_id <> ?
          AND (
            LOWER(name) = LOWER(?)
            OR LOWER(email) = LOWER(?)
          )
        LIMIT 1
      `,
      params: [userId, name, email]
    },
    {
      sql: `
        SELECT id AS conflict_user_id
        FROM users
        WHERE id <> ?
          AND (
            LOWER(name) = LOWER(?)
            OR LOWER(name) = LOWER(?)
            OR LOWER(email) = LOWER(?)
          )
        LIMIT 1
      `,
      params: [userId, name, name, email]
    },
    {
      sql: `
        SELECT id AS conflict_user_id
        FROM users
        WHERE id <> ?
          AND (
            LOWER(name) = LOWER(?)
            OR LOWER(email) = LOWER(?)
          )
        LIMIT 1
      `,
      params: [userId, name, email]
    }
  ]);

  return rows.length > 0;
};

const createProfileToken = ({ userId, name }) =>
  jwt.sign({ id: userId, name }, JWT_SECRET, { expiresIn: "1d" });

const resolveUserIdFromToken = async (user = {}) => {
  const directUserId = extractRequestUserId(user);
  if (directUserId) {
    return directUserId;
  }

  const tokenUsername = normalizeText(user.name || user.name);
  const tokenEmail = normalizeText(user.email).toLowerCase();
  if (!tokenUsername && !tokenEmail) {
    return null;
  }

  const nameQueries = tokenUsername
    ? [
        {
          sql: `
            SELECT user_id AS resolved_user_id
            FROM users
            WHERE name = ?
            LIMIT 1
          `,
          params: [tokenUsername]
        },
        {
          sql: `
            SELECT id AS resolved_user_id
            FROM users
            WHERE name = ?
            LIMIT 1
          `,
          params: [tokenUsername]
        },
        {
          sql: `
            SELECT user_id AS resolved_user_id
            FROM users
            WHERE name = ?
            LIMIT 1
          `,
          params: [tokenUsername]
        },
        {
          sql: `
            SELECT id AS resolved_user_id
            FROM users
            WHERE name = ?
            LIMIT 1
          `,
          params: [tokenUsername]
        }
      ]
    : [];

  const emailQueries = tokenEmail
    ? [
        {
          sql: `
            SELECT user_id AS resolved_user_id
            FROM users
            WHERE email = ?
            LIMIT 1
          `,
          params: [tokenEmail]
        },
        {
          sql: `
            SELECT id AS resolved_user_id
            FROM users
            WHERE email = ?
            LIMIT 1
          `,
          params: [tokenEmail]
        }
      ]
    : [];

  const resolvedRows = await runFirstCompatibleQuery([...nameQueries, ...emailQueries]);
  if (!resolvedRows.length) {
    return null;
  }

  const resolvedUserId = Number(resolvedRows[0].resolved_user_id);
  return Number.isInteger(resolvedUserId) && resolvedUserId > 0 ? resolvedUserId : null;
};

exports.getProfile = async (req, res) => {
  try {
    const userId = await resolveUserIdFromToken(req.user);
    if (!userId) {
      return res.status(401).json({ message: "Invalid user session" });
    }

    const results = await runFirstCompatibleQuery([
      {
        sql: `
          SELECT COALESCE(NULLIF(name, ''), name) AS name, email
          FROM users
          WHERE user_id = ?
          LIMIT 1
        `,
        params: [userId]
      },
      {
        sql: `
          SELECT name AS name, email
          FROM users
          WHERE user_id = ?
          LIMIT 1
        `,
        params: [userId]
      },
      {
        sql: `
          SELECT COALESCE(NULLIF(name, ''), name) AS name, email
          FROM users
          WHERE id = ?
          LIMIT 1
        `,
        params: [userId]
      },
      {
        sql: `
          SELECT name, email
          FROM users
          WHERE id = ?
          LIMIT 1
        `,
        params: [userId]
      }
    ]);

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(results[0]);
  } catch (error) {
    return res.status(500).json({ message: "Unable to load profile details right now." });
  }
};

exports.updateProfile = async (req, res) => {
  const name = normalizeText(req.body?.name);
  const email = normalizeText(req.body?.email).toLowerCase();

  if (!name || !email) {
    return res.status(400).json({ message: "Username and email are required" });
  }

  try {
    const userId = await resolveUserIdFromToken(req.user);
    if (!userId) {
      return res.status(401).json({ message: "Invalid user session" });
    }

    const hasConflict = await findProfileConflict({ userId, name, email });
    if (hasConflict) {
      return res.status(409).json({ message: "Username or email already in use" });
    }

    const result = await runFirstCompatibleQuery([
      {
        sql: `
          UPDATE users
          SET name = ?, name = ?, email = ?
          WHERE user_id = ?
        `,
        params: [name, name, email, userId]
      },
      {
        sql: `
          UPDATE users
          SET name = ?, email = ?
          WHERE user_id = ?
        `,
        params: [name, email, userId]
      },
      {
        sql: `
          UPDATE users
          SET name = ?, name = ?, email = ?
          WHERE id = ?
        `,
        params: [name, name, email, userId]
      },
      {
        sql: `
          UPDATE users
          SET name = ?, email = ?
          WHERE id = ?
        `,
        params: [name, email, userId]
      }
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const refreshedToken = createProfileToken({ userId, name });
    return res.json({
      message: "Profile updated successfully",
      token: refreshedToken,
      user: {
        id: userId,
        name,
        email
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username or email already in use" });
    }

    return res.status(500).json({ message: "Unable to update profile right now." });
  }
};
