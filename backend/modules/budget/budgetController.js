const db = require("../../config/db");

// 1. GET ALL BUDGETS
exports.getBudgets = (req, res) => {
  const { user_id } = req.query;
  const query = `
    SELECT
      b.budget_id,
      b.user_id,
      b.category_id,
      c.name,
      c.icon,
      b.amount,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions t
        WHERE t.user_id = b.user_id
          AND t.type = 'expense'
          AND t.category_id = b.category_id
      ), 0) AS spent,
      b.month,
      b.is_system_generated
    FROM budgets b
    LEFT JOIN categories c
      ON c.category_id = b.category_id
    WHERE COALESCE(b.is_system_generated, 0) = 0
      ${user_id ? "AND b.user_id = ?" : ""}
      AND LOWER(TRIM(COALESCE(c.name, ''))) <> 'monthly budget'
    ORDER BY b.budget_id DESC
  `;

  db.query(query, user_id ? [user_id] : [], (err, result) => {
    if (err) {
      console.error("SQL Error in getBudgets:", err.message);
      return res.status(500).json(err);
    }

    res.json(result);
  });
};

// 2. ADD NEW BUDGET
exports.addBudget = async (req, res) => {
  const { name, amount, icon, user_id, month } = req.body;

  if (!name || !amount) {
    return res.status(400).json({ error: "Name and amount are required" });
  }

  const resolvedUserId = user_id || 1;

  try {
    const [existingCategories] = await db.promise().query(
      `
        SELECT category_id
        FROM categories
        WHERE user_id = ?
          AND LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
      `,
      [resolvedUserId, name]
    );

    let categoryId = existingCategories[0]?.category_id;

    if (!categoryId) {
      const [insertCategoryResult] = await db.promise().query(
        `
          INSERT INTO categories (user_id, name, type, icon)
          VALUES (?, ?, 'expense', ?)
        `,
        [resolvedUserId, name, icon || null]
      );
      categoryId = insertCategoryResult.insertId;
    }

    const query = `
      INSERT INTO budgets (user_id, category_id, amount, month, is_system_generated)
      VALUES (?, ?, ?, ?, 0)
    `;

    db.query(query, [resolvedUserId, categoryId, amount, month || 1], (err, result) => {
      if (err) {
        console.error("SQL Error in addBudget:", err.message);
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        budget_id: result.insertId,
        user_id: resolvedUserId,
        category_id: categoryId,
        name,
        amount,
        icon,
        spent: 0,
        month: month || 1,
        is_system_generated: 0
      });
    });
  } catch (err) {
    console.error("Budget category sync error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 3. EDIT BUDGET AMOUNT
exports.editBudget = (req, res) => {
  const { budget_id, amount } = req.body;
  const query = "UPDATE budgets SET amount = ? WHERE budget_id = ?";

  db.query(query, [amount, budget_id], (err) => {
    if (err) {
      console.error("SQL Error in editBudget:", err.message);
      return res.status(500).json(err);
    }

    res.json({ message: "Budget updated successfully" });
  });
};

// 4. DELETE BUDGET
exports.deleteBudget = (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM budgets WHERE budget_id = ?";

  db.query(query, [id], (err) => {
    if (err) {
      console.error("SQL Error in deleteBudget:", err.message);
      return res.status(500).json(err);
    }

    res.json({ message: "Budget deleted successfully" });
  });
};
