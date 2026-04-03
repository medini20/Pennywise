const db = require("../../config/db");

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

exports.getCategories = async (req, res) => {
  const userId = Number(req.query.user_id);
  const type = normalizeText(req.query.type);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "Valid user_id is required" });
  }

  try {
    const params = [userId];
    let query = `
      SELECT category_id, user_id, name, type, icon
      FROM categories
      WHERE user_id = ?
    `;

    if (type) {
      query += " AND type = ?";
      params.push(type);
    }

    query += " ORDER BY LOWER(TRIM(name)) ASC";

    const [rows] = await db.promise().query(query, params);
    return res.json(rows);
  } catch (error) {
    console.error("CATEGORY LIST ERROR:", error);
    return res.status(500).json({ error: "Unable to load categories" });
  }
};

exports.addCategory = async (req, res) => {
  const userId = Number(req.body.user_id);
  const name = normalizeText(req.body.name);
  const type = normalizeText(req.body.type) || "expense";
  const icon = normalizeText(req.body.icon) || null;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "Valid user_id is required" });
  }

  if (!name) {
    return res.status(400).json({ error: "Category name is required" });
  }

  try {
    const [existingRows] = await db.promise().query(
      `
        SELECT category_id, user_id, name, type, icon
        FROM categories
        WHERE user_id = ?
          AND type = ?
          AND LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
      `,
      [userId, type, name]
    );

    if (existingRows.length > 0) {
      const existingCategory = existingRows[0];

      if (icon && icon !== existingCategory.icon) {
        await db.promise().query(
          `
            UPDATE categories
            SET icon = ?
            WHERE category_id = ?
          `,
          [icon, existingCategory.category_id]
        );
      }

      return res.json({
        category_id: existingCategory.category_id,
        user_id: existingCategory.user_id,
        name: existingCategory.name,
        type: existingCategory.type,
        icon: icon || existingCategory.icon || null
      });
    }

    const [result] = await db.promise().query(
      `
        INSERT INTO categories (user_id, name, type, icon)
        VALUES (?, ?, ?, ?)
      `,
      [userId, name, type, icon]
    );

    return res.status(201).json({
      category_id: result.insertId,
      user_id: userId,
      name,
      type,
      icon
    });
  } catch (error) {
    console.error("CATEGORY ADD ERROR:", error);
    return res.status(500).json({ error: "Unable to save category" });
  }
};
