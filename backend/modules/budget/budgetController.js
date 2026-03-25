const db = require("../../config/db");

// 1. GET ALL BUDGETS
exports.getBudgets = (req, res) => {
  const query = `
    SELECT
      b.budget_id,
      b.user_id,
      b.name,
      b.icon,
      b.amount,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions t
        LEFT JOIN categories c
          ON c.category_id = t.category_id
        WHERE t.user_id = b.user_id
          AND t.type = 'expense'
          AND (
            (
              b.icon IS NOT NULL
              AND TRIM(b.icon) <> ''
              AND c.icon IS NOT NULL
              AND TRIM(c.icon) <> ''
              AND TRIM(c.icon) = TRIM(b.icon)
            )
            OR LOWER(TRIM(COALESCE(c.name, ''))) = LOWER(TRIM(b.name))
            OR LOWER(TRIM(COALESCE(t.description, ''))) = LOWER(TRIM(b.name))
          )
      ), 0) AS spent,
      b.month,
      b.color,
      b.is_system_generated
    FROM budgets b
    WHERE COALESCE(b.is_system_generated, 0) = 0
      AND LOWER(TRIM(b.name)) <> 'monthly budget'
    ORDER BY b.budget_id DESC
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("SQL Error in getBudgets:", err.message);
      return res.status(500).json(err);
    }

    res.json(result);
  });
};

// 2. ADD NEW BUDGET
exports.addBudget = async (req, res) => {
  const { name, amount, icon, user_id, month, color } = req.body;

  if (!name || !amount) {
    return res.status(400).json({ error: "Name and amount are required" });
  }

  const resolvedUserId = user_id || 1;
  const query = `
    INSERT INTO budgets (name, amount, icon, user_id, month, spent, color, is_system_generated)
    VALUES (?, ?, ?, ?, ?, 0, ?, 0)
  `;

  const values = [
    name,
    amount,
    icon,
    resolvedUserId,
    month || 1,
    color || "#ffcc00"
  ];

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

    if (existingCategories.length === 0) {
      await db.promise().query(
        `
          INSERT INTO categories (user_id, name, type, icon)
          VALUES (?, ?, 'expense', ?)
        `,
        [resolvedUserId, name, icon || null]
      );
    }

    db.query(query, values, (err, result) => {
      if (err) {
        console.error("SQL Error in addBudget:", err.message);
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        budget_id: result.insertId,
        name,
        amount,
        icon,
        spent: 0,
        color: color || "#ffcc00"
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
