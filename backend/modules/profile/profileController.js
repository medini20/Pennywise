const db = require("../../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = require("../../utils/jwtSecret");

const runQuery = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");
const isValidEmail = (value) =>
  typeof value === "string" &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) &&
  value.trim().length <= 254;
const UNKNOWN_COLUMN_REGEX = /Unknown column/i;
const isBcryptHash = (value) =>
  typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);

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

const findProfileConflict = async ({ userId, username, email }) => {
  const rows = await runFirstCompatibleQuery([
    {
      sql: `
        SELECT user_id AS conflict_user_id
        FROM users
        WHERE user_id <> ?
          AND (
            LOWER(name) = LOWER(?)
            OR LOWER(username) = LOWER(?)
            OR LOWER(email) = LOWER(?)
          )
        LIMIT 1
      `,
      params: [userId, username, username, email]
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
      params: [userId, username, email]
    },
    {
      sql: `
        SELECT user_id AS conflict_user_id
        FROM users
        WHERE user_id <> ?
          AND (
            LOWER(username) = LOWER(?)
            OR LOWER(email) = LOWER(?)
          )
        LIMIT 1
      `,
      params: [userId, username, email]
    },
    {
      sql: `
        SELECT id AS conflict_user_id
        FROM users
        WHERE id <> ?
          AND (
            LOWER(name) = LOWER(?)
            OR LOWER(username) = LOWER(?)
            OR LOWER(email) = LOWER(?)
          )
        LIMIT 1
      `,
      params: [userId, username, username, email]
    },
    {
      sql: `
        SELECT id AS conflict_user_id
        FROM users
        WHERE id <> ?
          AND (
            LOWER(username) = LOWER(?)
            OR LOWER(email) = LOWER(?)
          )
        LIMIT 1
      `,
      params: [userId, username, email]
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
      params: [userId, username, email]
    }
  ]);

  return rows.length > 0;
};

const createProfileToken = ({ userId, username }) =>
  jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: "1d" });

const withTransaction = async (callback) => {
  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const resolveUserIdFromToken = async (user = {}) => {
  const directUserId = extractRequestUserId(user);
  if (directUserId) {
    return directUserId;
  }

  const tokenUsername = normalizeText(user.username || user.name);
  const tokenEmail = normalizeText(user.email).toLowerCase();
  if (!tokenUsername && !tokenEmail) {
    return null;
  }

  const usernameQueries = tokenUsername
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
            WHERE username = ?
            LIMIT 1
          `,
          params: [tokenUsername]
        },
        {
          sql: `
            SELECT id AS resolved_user_id
            FROM users
            WHERE username = ?
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

  const resolvedRows = await runFirstCompatibleQuery([...usernameQueries, ...emailQueries]);
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
          SELECT COALESCE(
            NULLIF(TRIM(name), ''),
            NULLIF(TRIM(username), ''),
            SUBSTRING_INDEX(email, '@', 1)
          ) AS username,
          email
          FROM users
          WHERE user_id = ?
          LIMIT 1
        `,
        params: [userId]
      },
      {
        sql: `
          SELECT COALESCE(NULLIF(TRIM(name), ''), SUBSTRING_INDEX(email, '@', 1)) AS username, email
          FROM users
          WHERE user_id = ?
          LIMIT 1
        `,
        params: [userId]
      },
      {
        sql: `
          SELECT COALESCE(
            NULLIF(TRIM(name), ''),
            NULLIF(TRIM(username), ''),
            SUBSTRING_INDEX(email, '@', 1)
          ) AS username,
          email
          FROM users
          WHERE id = ?
          LIMIT 1
        `,
        params: [userId]
      },
      {
        sql: `
          SELECT COALESCE(NULLIF(TRIM(username), ''), SUBSTRING_INDEX(email, '@', 1)) AS username, email
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
  const username = normalizeText(req.body?.username || req.body?.name);
  const email = normalizeText(req.body?.email).toLowerCase();

  if (!username || !email) {
    return res.status(400).json({ message: "Username and email are required" });
  }

  if (username.length < 2 || username.length > 100) {
    return res.status(400).json({ message: "Username must be between 2 and 100 characters" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Please provide a valid email address" });
  }

  try {
    const userId = await resolveUserIdFromToken(req.user);
    if (!userId) {
      return res.status(401).json({ message: "Invalid user session" });
    }

    const hasConflict = await findProfileConflict({ userId, username, email });
    if (hasConflict) {
      return res.status(409).json({ message: "Username or email already in use" });
    }

    const result = await runFirstCompatibleQuery([
      {
        sql: `
          UPDATE users
          SET name = ?, username = ?, email = ?
          WHERE user_id = ?
        `,
        params: [username, username, email, userId]
      },
      {
        sql: `
          UPDATE users
          SET name = ?, email = ?
          WHERE user_id = ?
        `,
        params: [username, email, userId]
      },
      {
        sql: `
          UPDATE users
          SET username = ?, email = ?
          WHERE user_id = ?
        `,
        params: [username, email, userId]
      },
      {
        sql: `
          UPDATE users
          SET name = ?, username = ?, email = ?
          WHERE id = ?
        `,
        params: [username, username, email, userId]
      },
      {
        sql: `
          UPDATE users
          SET username = ?, email = ?
          WHERE id = ?
        `,
        params: [username, email, userId]
      },
      {
        sql: `
          UPDATE users
          SET name = ?, email = ?
          WHERE id = ?
        `,
        params: [username, email, userId]
      }
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const refreshedToken = createProfileToken({ userId, username });
    return res.json({
      message: "Profile updated successfully",
      token: refreshedToken,
      user: {
        id: userId,
        username,
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

exports.deleteAccount = async (req, res) => {
  const currentPassword = req.body?.password;

  if (typeof currentPassword !== "string" || !currentPassword) {
    return res.status(400).json({ message: "Current password is required" });
  }

  try {
    const userId = await resolveUserIdFromToken(req.user);
    if (!userId) {
      return res.status(401).json({ message: "Invalid user session" });
    }

    const deletedUser = await withTransaction(async (connection) => {
      let users = [];
      try {
        [users] = await connection.query(
          `
            SELECT user_id, email, password_hash
            FROM users
            WHERE user_id = ?
            LIMIT 1
          `,
          [userId]
        );
      } catch (error) {
        if (!UNKNOWN_COLUMN_REGEX.test(error.message)) {
          throw error;
        }

        try {
          [users] = await connection.query(
            `
              SELECT user_id, email, password
              FROM users
              WHERE user_id = ?
              LIMIT 1
            `,
            [userId]
          );
        } catch (fallbackError) {
          if (!UNKNOWN_COLUMN_REGEX.test(fallbackError.message)) {
            throw fallbackError;
          }

          try {
            [users] = await connection.query(
              `
                SELECT id AS user_id, email, password_hash
                FROM users
                WHERE id = ?
                LIMIT 1
              `,
              [userId]
            );
          } catch (legacyIdError) {
            if (!UNKNOWN_COLUMN_REGEX.test(legacyIdError.message)) {
              throw legacyIdError;
            }

            [users] = await connection.query(
              `
                SELECT id AS user_id, email, password
                FROM users
                WHERE id = ?
                LIMIT 1
              `,
              [userId]
            );
          }
        }
      }

      if (users.length === 0) {
        return null;
      }

      const userEmail = normalizeText(users[0].email).toLowerCase();
      const storedPassword = users[0].password_hash || users[0].password || "";
      const isCurrentPasswordValid = isBcryptHash(storedPassword)
        ? await bcrypt.compare(currentPassword, storedPassword)
        : currentPassword === storedPassword;

      if (!isCurrentPasswordValid) {
        return false;
      }

      const [recurringPayments] = await connection.query(
        `
          SELECT recurring_payment_id
          FROM recurring_payments
          WHERE user_id = ?
        `,
        [userId]
      );

      const recurringPaymentIds = recurringPayments
        .map((row) => Number(row.recurring_payment_id))
        .filter((value) => Number.isInteger(value) && value > 0);

      if (recurringPaymentIds.length > 0) {
        const recurringPlaceholders = recurringPaymentIds.map(() => "?").join(", ");
        await connection.query(
          `
            DELETE FROM recurring_payment_exceptions
            WHERE recurring_payment_id IN (${recurringPlaceholders})
          `,
          recurringPaymentIds
        );
      }

      await connection.query("DELETE FROM alerts WHERE user_id = ?", [userId]);
      await connection.query("DELETE FROM recurring_payments WHERE user_id = ?", [userId]);
      await connection.query("DELETE FROM transactions WHERE user_id = ?", [userId]);
      await connection.query("DELETE FROM categories WHERE user_id = ?", [userId]);
      await connection.query("DELETE FROM budgets WHERE user_id = ?", [userId]);

      if (userEmail) {
        await connection.query("DELETE FROM otps WHERE email = ?", [userEmail]);
      }

      let deleteResult;
      try {
        [deleteResult] = await connection.query("DELETE FROM users WHERE user_id = ?", [userId]);
      } catch (error) {
        if (!UNKNOWN_COLUMN_REGEX.test(error.message)) {
          throw error;
        }

        [deleteResult] = await connection.query("DELETE FROM users WHERE id = ?", [userId]);
      }

      return deleteResult.affectedRows > 0 ? users[0] : null;
    });

    if (deletedUser === false) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "Account deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete account right now." });
  }
};
