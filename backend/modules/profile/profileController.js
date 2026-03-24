const db = require("../../config/db");

const runQuery = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

exports.getProfile = async (req, res) => {
  const userId = Number(req.user?.id || req.user?.user_id);

  try {
    const results = await runQuery(
      `
        SELECT name AS username, email
        FROM users
        WHERE user_id = ?
        LIMIT 1
      `,
      [userId]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(results[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  const userId = Number(req.user?.id || req.user?.user_id);
  const username = normalizeText(req.body?.username);
  const email = normalizeText(req.body?.email).toLowerCase();

  if (!username || !email) {
    return res.status(400).json({ message: "Username and email are required" });
  }

  try {
    const result = await runQuery(
      `
        UPDATE users
        SET name = ?, email = ?
        WHERE user_id = ?
      `,
      [username, email, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "Profile updated successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username or email already in use" });
    }

    return res.status(500).json({ error: error.message });
  }
};
