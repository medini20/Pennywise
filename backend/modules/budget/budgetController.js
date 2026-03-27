const db = require("../../config/db");
const {
  getResolvedDateRange,
  syncBudgetLifecycle
} = require("./budgetLifecycle");

const DEFAULT_USER_ID = 1;
const DEFAULT_BUDGET_NAME = "Monthly Budget";
let budgetCategoryIdColumnExists = null;

const getUserId = (req) => {
  const body = req.body || {};
  const query = req.query || {};
  const rawUserId = body.user_id || query.user_id;
  const parsedUserId = Number(rawUserId);

  return Number.isInteger(parsedUserId) && parsedUserId > 0
    ? parsedUserId
    : DEFAULT_USER_ID;
};

const hasBudgetCategoryIdColumn = async () => {
  if (budgetCategoryIdColumnExists !== null) {
    return budgetCategoryIdColumnExists;
  }

  try {
    const databaseName = process.env.DB_NAME || "expense_tracker";
    const [rows] = await db.promise().query(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'budgets'
          AND COLUMN_NAME = 'category_id'
        LIMIT 1
      `,
      [databaseName]
    );

    budgetCategoryIdColumnExists = rows.length > 0;
  } catch (error) {
    budgetCategoryIdColumnExists = false;
  }

  return budgetCategoryIdColumnExists;
};

const findOrCreateExpenseCategory = async (userId, name, icon) => {
  const [existingCategories] = await db.promise().query(
    `
      SELECT category_id
      FROM categories
      WHERE user_id = ?
        AND LOWER(TRIM(name)) = LOWER(TRIM(?))
      LIMIT 1
    `,
    [userId, name]
  );

  if (existingCategories.length > 0) {
    return existingCategories[0].category_id;
  }

  const [insertResult] = await db.promise().query(
    `
      INSERT INTO categories (user_id, name, type, icon)
      VALUES (?, ?, 'expense', ?)
    `,
    [userId, name, icon || null]
  );

  return insertResult.insertId;
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
            AND DATE(t.transaction_date) BETWEEN
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
  const normalizedName = typeof name === "string" ? name.trim() : "";

  if (!normalizedName) {
    return res.status(400).json({ error: "Name and amount are required" });
  }

  try {
    const resolvedDates = getResolvedDateRange(start_date, end_date);
    const hasCategoryIdColumn = await hasBudgetCategoryIdColumn();
    const [existingBudgets] = await db.promise().query(
      `
        SELECT budget_id
        FROM budgets
        WHERE user_id = ?
          AND COALESCE(is_system_generated, 0) = 0
          AND LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
      `,
      [resolvedUserId, normalizedName]
    );

    if (existingBudgets.length > 0) {
      return res.status(409).json({ error: "A category with this name already exists." });
    }

    const categoryId = await findOrCreateExpenseCategory(resolvedUserId, name, icon);

    const query = hasCategoryIdColumn
      ? `
          INSERT INTO budgets (
            name,
            amount,
            icon,
            user_id,
            category_id,
            month,
            spent,
            color,
            start_date,
            end_date,
            is_system_generated
          )
          VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0)
        `
      : `
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

    const values = hasCategoryIdColumn
      ? [
          name,
          amount,
          icon,
          resolvedUserId,
          categoryId,
          month || 1,
          color || "#ffcc00",
          resolvedDates.startDate,
          resolvedDates.endDate
        ]
      : [
          name,
          amount,
          icon,
          resolvedUserId,
          month || 1,
          color || "#ffcc00",
          resolvedDates.startDate,
          resolvedDates.endDate
        ];

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
    const userId = getUserId(req);
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

    const finishUpdate = async () => {
      const nextValues = [...values];
      const hasCategoryIdColumn = await hasBudgetCategoryIdColumn();

      if (name !== undefined) {
        const categoryId = await findOrCreateExpenseCategory(userId, name, null);

        if (hasCategoryIdColumn) {
          updates.push("category_id = ?");
          nextValues.push(categoryId);
        }
      }

      const query = `UPDATE budgets SET ${updates.join(", ")} WHERE budget_id = ? AND user_id = ?`;

      nextValues.push(budget_id);
      nextValues.push(userId);

      db.query(query, nextValues, (err, result) => {
        if (err) {
          console.error("SQL Error in editBudget:", err.message);
          return res.status(500).json(err);
        }

        if (!result.affectedRows) {
          return res.status(404).json({ error: "Budget not found for this user" });
        }

        return res.json({ message: "Budget updated successfully" });
      });
    };

    if (name !== undefined) {
      db.query(
        `
          SELECT budget_id
          FROM budgets
          WHERE user_id = ?
            AND COALESCE(is_system_generated, 0) = 0
            AND LOWER(TRIM(name)) = LOWER(TRIM(?))
            AND budget_id <> ?
          LIMIT 1
        `,
        [userId, name, budget_id],
        (duplicateErr, duplicateRows) => {
          if (duplicateErr) {
            console.error("SQL Error in editBudget duplicate check:", duplicateErr.message);
            return res.status(500).json(duplicateErr);
          }

          if (duplicateRows.length > 0) {
            return res.status(409).json({ error: "A category with this name already exists." });
          }

          return finishUpdate().catch((updateErr) => {
            console.error("Budget update sync error:", updateErr.message);
            return res.status(400).json({ error: updateErr.message });
          });
        }
      );

      return;
    }

    finishUpdate().catch((updateErr) => {
      console.error("Budget update sync error:", updateErr.message);
      return res.status(400).json({ error: updateErr.message });
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// 4. DELETE BUDGET
exports.deleteBudget = (req, res) => {
  const userId = getUserId(req);
  const id = req.params.id;
  const query = "DELETE FROM budgets WHERE budget_id = ? AND user_id = ?";

  db.query(
    "DELETE FROM alerts WHERE budget_id = ? AND user_id = ?",
    [id, userId],
    (alertErr) => {
      if (alertErr) {
        console.error("SQL Error in deleteBudget alerts cleanup:", alertErr.message);
        return res.status(500).json({ error: alertErr.message });
      }

      db.query("DELETE FROM expenses WHERE budget_id = ?", [id], (expenseErr) => {
        if (expenseErr && expenseErr.code !== "ER_NO_SUCH_TABLE") {
          console.error("SQL Error in deleteBudget expenses cleanup:", expenseErr.message);
          return res.status(500).json({ error: expenseErr.message });
        }

        db.query(query, [id, userId], (err, result) => {
          if (err) {
            console.error("SQL Error in deleteBudget:", err.message);
            return res.status(500).json({ error: err.message });
          }

          if (!result.affectedRows) {
            return res.status(404).json({ error: "Budget not found for this user" });
          }

          return res.json({ message: "Budget deleted successfully" });
        });
      });
    }
  );
};
