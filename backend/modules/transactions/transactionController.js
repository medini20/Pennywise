const db = require("../../config/db");

const normalizeCategoryName = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeCategoryIcon = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const resolveCategoryId = async ({ userId, categoryName, categoryIcon, type }) => {
  const [existingCategories] = await db.promise().query(
    `
      SELECT category_id
      FROM categories
      WHERE user_id = ?
        AND type = ?
        AND (
          (? IS NOT NULL AND icon = ?)
          OR LOWER(TRIM(name)) = LOWER(TRIM(?))
        )
      LIMIT 1
    `,
    [userId, type, categoryIcon, categoryIcon, categoryName]
  );

  let categoryId = existingCategories[0]?.category_id;

  if (!categoryId) {
    const [insertCategoryResult] = await db.promise().query(
      `
        INSERT INTO categories (user_id, name, type, icon)
        VALUES (?, ?, ?, ?)
      `,
      [userId, categoryName, type, categoryIcon]
    );

    categoryId = insertCategoryResult.insertId;
  } else if (categoryIcon) {
    await db.promise().query(
      `
        UPDATE categories
        SET icon = COALESCE(icon, ?)
        WHERE category_id = ?
      `,
      [categoryIcon, categoryId]
    );
  }

  return categoryId;
};

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
    const categoryId = await resolveCategoryId({
      userId: user_id,
      categoryName: finalCategoryName,
      categoryIcon: finalCategoryIcon,
      type
    });

    const [result] = await db.promise().query(
      `
        INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `,
      [user_id, categoryId, amount, type, finalDescription, finalTransactionDate]
    );

    return res.json({
      message: "Transaction added successfully",
      transaction_id: result.insertId,
      category_id: categoryId,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("TRANSACTION ERROR:", err);
    return res.status(500).json({ message: "Insert failed" });
  }
};

exports.updateTransaction = async (req, res) => {
  const { transactionId } = req.params;
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
    const [existingTransactions] = await db.promise().query(
      `
        SELECT transaction_id
        FROM transactions
        WHERE transaction_id = ? AND user_id = ?
        LIMIT 1
      `,
      [transactionId, user_id]
    );

    if (existingTransactions.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const categoryId = await resolveCategoryId({
      userId: user_id,
      categoryName: finalCategoryName,
      categoryIcon: finalCategoryIcon,
      type
    });

    await db.promise().query(
      `
        UPDATE transactions
        SET category_id = ?, amount = ?, type = ?, description = ?, transaction_date = ?
        WHERE transaction_id = ? AND user_id = ?
      `,
      [categoryId, amount, type, finalDescription, finalTransactionDate, transactionId, user_id]
    );

    return res.json({
      message: "Transaction updated successfully",
      category_id: categoryId
    });
  } catch (err) {
    console.error("TRANSACTION UPDATE ERROR:", err);
    return res.status(500).json({ message: "Update failed" });
  }
};

exports.deleteTransaction = async (req, res) => {
  const { transactionId } = req.params;
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: "user_id is required" });
  }

  try {
    const [result] = await db.promise().query(
      `
        DELETE FROM transactions
        WHERE transaction_id = ? AND user_id = ?
      `,
      [transactionId, user_id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    return res.json({ message: "Transaction deleted successfully" });
  } catch (err) {
    console.error("TRANSACTION DELETE ERROR:", err);
    return res.status(500).json({ message: "Delete failed" });
  }
};

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
