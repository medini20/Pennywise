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
      CASE
        WHEN b.end_date IS NOT NULL AND CURDATE() > b.end_date THEN 0
        ELSE COALESCE((
          SELECT SUM(t.amount)
          FROM transactions t
          LEFT JOIN categories c
            ON c.category_id = t.category_id
          WHERE t.user_id = b.user_id
            AND t.type = 'expense'
            AND (b.start_date IS NULL OR DATE(t.transaction_date) >= b.start_date)
            AND (b.end_date IS NULL OR DATE(t.transaction_date) <= b.end_date)
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
        ), 0)
      END AS spent,
      b.month,
      b.color,
      b.is_system_generated,
      b.start_date,
      b.end_date
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
  const { name, amount, icon, user_id, month, color, start_date, end_date } = req.body;

  if (!name || !amount) {
    return res.status(400).json({ error: "Name and amount are required" });
  }

  if (start_date && end_date && start_date > end_date) {
    return res.status(400).json({ error: "End date must be after start date" });
  }

  const resolvedUserId = user_id || 1;
  const query = `
    INSERT INTO budgets (name, amount, icon, user_id, month, spent, color, is_system_generated, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, ?)
  `;

  const values = [
    name,
    amount,
    icon,
    resolvedUserId,
    month || 1,
    color || "#ffcc00",
    start_date || null,
    end_date || null
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
        color: color || "#ffcc00",
        start_date: start_date || null,
        end_date: end_date || null
      });
    });
  } catch (err) {
    console.error("Budget category sync error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 3. EDIT BUDGET AMOUNT
exports.editBudget = (req, res) => {
  const { budget_id, amount, name, start_date, end_date } = req.body;

  if (start_date && end_date && start_date > end_date) {
    return res.status(400).json({ error: "End date must be after start date" });
  }

  const query = `
    UPDATE budgets
    SET amount = ?, name = ?, start_date = ?, end_date = ?
    WHERE budget_id = ?
  `;

  db.query(query, [amount, name, start_date || null, end_date || null, budget_id], (err) => {
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
