const db = require("../../config/db");

const normalizeCategoryName = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeCategoryIcon = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

exports.addTransaction = async (req, res) => {
  const { user_id, amount, type, description, note, transaction_date, category, categoryIcon } = req.body;

  const finalDescription = description || note || "No description";
  const finalTransactionDate =
    typeof transaction_date === "string" && transaction_date.trim()
      ? transaction_date
      : new Date().toISOString().slice(0, 10);
  const finalCategoryName = normalizeCategoryName(category);
  const finalCategoryIcon = normalizeCategoryIcon(categoryIcon);

  if (!user_id || !amount || !type || !finalCategoryName) {
    return res.status(400).json({ message: "user_id, amount, type, and category are required" });
  }

  try {
    const [existingCategories] = await db.promise().query(
      `
        SELECT category_id
        FROM categories
        WHERE user_id = ?
          AND (
            (? IS NOT NULL AND icon = ?)
            OR LOWER(TRIM(name)) = LOWER(TRIM(?))
          )
        LIMIT 1
      `,
      [user_id, finalCategoryIcon, finalCategoryIcon, finalCategoryName]
    );

    let categoryId = existingCategories[0]?.category_id;

    if (!categoryId) {
      const [insertCategoryResult] = await db.promise().query(
        `
          INSERT INTO categories (user_id, name, type, icon)
          VALUES (?, ?, ?, ?)
        `,
        [user_id, finalCategoryName, type, finalCategoryIcon]
      );

      categoryId = insertCategoryResult.insertId;
    } else if (finalCategoryIcon) {
      await db.promise().query(
        `
          UPDATE categories
          SET icon = COALESCE(icon, ?)
          WHERE category_id = ?
        `,
        [finalCategoryIcon, categoryId]
      );
    }

    const query = `
      INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      query,
      [user_id, categoryId, amount, type, finalDescription, finalTransactionDate],
      (err) => {
        if (err) {
          console.error("INSERT ERROR:", err);
          return res.status(500).json({ message: "Insert failed" });
        }

        res.json({
          message: "Transaction added successfully",
          category_id: categoryId
        });
      }
    );
  } catch (err) {
    console.error("TRANSACTION ERROR:", err);
    return res.status(500).json({ message: "Insert failed" });
  }
};

   
// GET
exports.getTransactions = (req, res) => {
  const { user_id } = req.query;

  const query = `
    SELECT
      t.*,
      c.name AS category_name,
      c.icon AS category_icon
    FROM transactions t
    LEFT JOIN categories c
      ON c.category_id = t.category_id
    WHERE t.user_id = ?
    ORDER BY t.transaction_date DESC, t.transaction_id DESC
  `;

  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    res.json(results);
  });
};
