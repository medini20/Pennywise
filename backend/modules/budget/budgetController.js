const db = require("../../config/db");
const {
  getResolvedDateRange,
  syncBudgetLifecycle
} = require("./budgetLifecycle");

const DEFAULT_USER_ID = 1;
const DEFAULT_BUDGET_NAME = "Monthly Budget";

const getUserId = (req) => {
  const body = req.body || {};
  const query = req.query || {};
  const rawUserId = body.user_id || query.user_id;
  const parsedUserId = Number(rawUserId);

  return Number.isInteger(parsedUserId) && parsedUserId > 0
    ? parsedUserId
    : DEFAULT_USER_ID;
};

// 1. GET ALL BUDGETS
exports.getBudgets = async (req, res) => {
  const userId = getUserId(req);

  try {
    await syncBudgetLifecycle(userId);

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
            AND t.transaction_date BETWEEN
              COALESCE(b.start_date, DATE_FORMAT(CURDATE(), '%Y-%m-01'))
              AND COALESCE(b.end_date, LAST_DAY(CURDATE()))
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
        b.start_date,
        b.end_date,
        b.is_system_generated
      FROM budgets b
      WHERE b.user_id = ?
        AND COALESCE(b.is_system_generated, 0) = 0
        AND LOWER(TRIM(b.name)) <> LOWER(TRIM(?))
      ORDER BY b.budget_id DESC
    `;

    db.query(query, [userId, DEFAULT_BUDGET_NAME], (err, result) => {
      if (err) {
        console.error("SQL Error in getBudgets:", err.message);
        return res.status(500).json(err);
      }

      return res.json(
        result.map((budgetRow) => {
          const resolvedDates = getResolvedDateRange(
            budgetRow.start_date,
            budgetRow.end_date
          );

          return {
            ...budgetRow,
            start_date: resolvedDates.startDate,
            end_date: resolvedDates.endDate
          };
        })
      );
    });
  } catch (err) {
    console.error("Budget lifecycle error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 2. ADD NEW BUDGET
exports.addBudget = async (req, res) => {
  const { name, amount, icon, user_id, month, color, start_date, end_date } = req.body;

  if (!name || !amount) {
    return res.status(400).json({ error: "Name and amount are required" });
  }

  const resolvedUserId = user_id || 1;

  try {
    const resolvedDates = getResolvedDateRange(start_date, end_date);
    const query = `
      INSERT INTO budgets (
        name,
        amount,
        icon,
        user_id,
        month,
        spent,
        color,
        start_date,
        end_date,
        is_system_generated
      )
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 0)
    `;

    const values = [
      name,
      amount,
      icon,
      resolvedUserId,
      month || 1,
      color || "#ffcc00",
      resolvedDates.startDate,
      resolvedDates.endDate
    ];

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

      return res.status(201).json({
        budget_id: result.insertId,
        name,
        amount,
        icon,
        spent: 0,
        color: color || "#ffcc00",
        start_date: resolvedDates.startDate,
        end_date: resolvedDates.endDate
      });
    });
  } catch (err) {
    console.error("Budget category sync error:", err.message);
    return res.status(400).json({ error: err.message });
  }
};

// 3. EDIT BUDGET
exports.editBudget = (req, res) => {
  try {
    const { budget_id, amount, name, start_date, end_date } = req.body;
    const updates = [];
    const values = [];
    const resolvedDates =
      start_date !== undefined || end_date !== undefined
        ? getResolvedDateRange(start_date, end_date)
        : null;

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }

    if (amount !== undefined) {
      updates.push("amount = ?");
      values.push(amount);
    }

    if (start_date !== undefined) {
      updates.push("start_date = ?");
      values.push(resolvedDates.startDate);
    }

    if (end_date !== undefined) {
      updates.push("end_date = ?");
      values.push(resolvedDates.endDate);
    }

    if (!budget_id || updates.length === 0) {
      return res.status(400).json({ error: "budget_id and at least one field are required" });
    }

    const query = `UPDATE budgets SET ${updates.join(", ")} WHERE budget_id = ?`;

    values.push(budget_id);

    db.query(query, values, (err) => {
      if (err) {
        console.error("SQL Error in editBudget:", err.message);
        return res.status(500).json(err);
      }

      return res.json({ message: "Budget updated successfully" });
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
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

    return res.json({ message: "Budget deleted successfully" });
  });
};
