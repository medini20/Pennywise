const db = require("../../config/db");
const DEFAULT_USER_ID = 1;
const DEFAULT_BUDGET_NAME = "Monthly Budget";
const DEFAULT_BUDGET_COLOR = "#ffcc00";
let budgetCategoryIdColumnExists = null;
const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  });
const padNumber = (value) => String(value).padStart(2, "0");
const formatDateValue = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
      return trimmedValue;
    }
    const parsedDate = new Date(trimmedValue);
    if (!Number.isNaN(parsedDate.getTime())) {
      return `${parsedDate.getFullYear()}-${padNumber(parsedDate.getMonth() + 1)}-${padNumber(
        parsedDate.getDate()
      )}`;
    }
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${padNumber(value.getMonth() + 1)}-${padNumber(
      value.getDate()
    )}`;
  }
  return null;
};
const normalizeBudgetName = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const getCurrentPeriod = () => {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
  };
};
const getCurrentMonthDateRange = (referenceDate = new Date()) => ({
  startDate: `${referenceDate.getFullYear()}-${padNumber(referenceDate.getMonth() + 1)}-01`,
  endDate: formatDateValue(
    new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
  )
});
const getMonthNumberFromDate = (value) => {
  const normalizedValue = formatDateValue(value);
  if (!normalizedValue) {
    return getCurrentPeriod().month;
  }
  return Number(normalizedValue.slice(5, 7));
};
const getResolvedDateRange = (startDateValue, endDateValue, referenceDate = new Date()) => {
  const defaultRange = getCurrentMonthDateRange(referenceDate);
  const startDate = formatDateValue(startDateValue) || defaultRange.startDate;
  const endDate = formatDateValue(endDateValue) || defaultRange.endDate;
  if (startDate > endDate) {
    throw new Error("Start date must be on or before end date");
  }
  return {
    startDate,
    endDate
  };
};
const getLatestMonthlyBudget = async (userId) => {
  const rows = await runQuery(
    `SELECT budget_id, user_id, name, icon, amount, spent, month, color, start_date, end_date,
            COALESCE(is_system_generated, 0) AS is_system_generated
     FROM budgets
     WHERE user_id = ?
       AND (
         COALESCE(is_system_generated, 0) = 1
         OR LOWER(TRIM(name)) = LOWER(TRIM(?))
       )
     ORDER BY budget_id DESC
     LIMIT 1`,
    [userId, DEFAULT_BUDGET_NAME]
  );
  return rows[0] || null;
};
const syncBudgetLifecycle = async (userId) => {
  const today = formatDateValue(new Date());
  const { month } = getCurrentPeriod();
  const currentRange = getCurrentMonthDateRange();
  await runQuery(
    `DELETE a
     FROM alerts a
     INNER JOIN budgets b
       ON b.budget_id = a.budget_id
     WHERE b.user_id = ?
       AND (
         COALESCE(b.is_system_generated, 0) = 1
         OR LOWER(TRIM(b.name)) = LOWER(TRIM(?))
       )
       AND b.end_date IS NOT NULL
       AND b.end_date < ?`,
    [userId, DEFAULT_BUDGET_NAME, today]
  );
  await runQuery(
    `DELETE FROM budgets
     WHERE user_id = ?
       AND COALESCE(is_system_generated, 0) = 0
       AND LOWER(TRIM(name)) <> LOWER(TRIM(?))
       AND end_date IS NOT NULL
       AND end_date < ?`,
    [userId, DEFAULT_BUDGET_NAME, today]
  );
  const monthlyBudget = await getLatestMonthlyBudget(userId);
  if (!monthlyBudget) {
    return null;
  }
  const resolvedDates = getResolvedDateRange(
    monthlyBudget.start_date,
    monthlyBudget.end_date
  );
  const shouldResetMonthlyBudget =
    resolvedDates.endDate < today ||
    Number(monthlyBudget.month) !== month ||
    normalizeBudgetName(monthlyBudget.name) !== normalizeBudgetName(DEFAULT_BUDGET_NAME) ||
    Number(monthlyBudget.is_system_generated) !== 1;
  if (!shouldResetMonthlyBudget) {
    return {
      ...monthlyBudget,
      name: DEFAULT_BUDGET_NAME,
      start_date: resolvedDates.startDate,
      end_date: resolvedDates.endDate,
      is_system_generated: 1
    };
  }
  await runQuery("DELETE FROM alerts WHERE budget_id = ?", [monthlyBudget.budget_id]);
  await runQuery(
    `UPDATE budgets
     SET name = ?, month = ?, start_date = ?, end_date = ?, is_system_generated = 1
     WHERE budget_id = ?`,
    [
      DEFAULT_BUDGET_NAME,
      month,
      currentRange.startDate,
      currentRange.endDate,
      monthlyBudget.budget_id
    ]
  );
  return {
    ...monthlyBudget,
    name: DEFAULT_BUDGET_NAME,
    month,
    start_date: currentRange.startDate,
    end_date: currentRange.endDate,
    is_system_generated: 1
  };
};
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
      ORDER BY category_id DESC
      LIMIT 1
    `,
    [userId, name]
  );
  if (existingCategories.length > 0) {
    if (icon) {
      await db.promise().query(
        `
          UPDATE categories
          SET icon = ?
          WHERE category_id = ?
        `,
        [icon, existingCategories[0].category_id]
      );
    }
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
exports.getBudgets = async (req, res) => {
  const userId = getUserId(req);
  try {
    await syncBudgetLifecycle(userId);
    const hasCategoryIdColumn = await hasBudgetCategoryIdColumn();
    const query = hasCategoryIdColumn
      ? `SELECT b.budget_id, b.user_id, b.category_id, b.name, b.icon, b.amount,
            CASE
              WHEN b.end_date IS NOT NULL AND CURDATE() > b.end_date THEN 0
              ELSE COALESCE((
                SELECT SUM(t.amount)
                FROM transactions t
                LEFT JOIN categories c ON c.category_id = t.category_id
                WHERE t.user_id = b.user_id
                  AND t.type = 'expense'
                  AND (b.start_date IS NULL OR DATE(t.transaction_date) >= b.start_date)
                  AND (b.end_date IS NULL OR DATE(t.transaction_date) <= b.end_date)
                  AND (
                    (b.category_id IS NOT NULL AND t.category_id = b.category_id)
                    OR (
                      b.category_id IS NULL
                      AND (
                        (b.icon IS NOT NULL AND TRIM(b.icon) <> '' AND c.icon IS NOT NULL AND TRIM(c.icon) <> '' AND TRIM(c.icon) = TRIM(b.icon))
                        OR LOWER(TRIM(COALESCE(c.name, ''))) = LOWER(TRIM(b.name))
                        OR LOWER(TRIM(COALESCE(t.description, ''))) = LOWER(TRIM(b.name))
                      )
                    )
                  )
              ), 0)
            END AS spent, b.month, b.color, b.start_date, b.end_date, b.is_system_generated
         FROM budgets b
         WHERE b.user_id = ? AND COALESCE(b.is_system_generated, 0) = 0
           AND LOWER(TRIM(b.name)) <> LOWER(TRIM(?))
         ORDER BY b.budget_id DESC`
      : `SELECT b.budget_id, b.user_id, b.name, b.icon, b.amount,
            CASE
              WHEN b.end_date IS NOT NULL AND CURDATE() > b.end_date THEN 0
              ELSE COALESCE((
                SELECT SUM(t.amount)
                FROM transactions t
                LEFT JOIN categories c ON c.category_id = t.category_id
                WHERE t.user_id = b.user_id
                  AND t.type = 'expense'
                  AND (b.start_date IS NULL OR DATE(t.transaction_date) >= b.start_date)
                  AND (b.end_date IS NULL OR DATE(t.transaction_date) <= b.end_date)
                  AND (
                    (b.icon IS NOT NULL AND TRIM(b.icon) <> '' AND c.icon IS NOT NULL AND TRIM(c.icon) <> '' AND TRIM(c.icon) = TRIM(b.icon))
                    OR LOWER(TRIM(COALESCE(c.name, ''))) = LOWER(TRIM(b.name))
                    OR LOWER(TRIM(COALESCE(t.description, ''))) = LOWER(TRIM(b.name))
                  )
              ), 0)
            END AS spent, b.month, b.color, b.start_date, b.end_date, b.is_system_generated
         FROM budgets b
         WHERE b.user_id = ? AND COALESCE(b.is_system_generated, 0) = 0
           AND LOWER(TRIM(b.name)) <> LOWER(TRIM(?))
         ORDER BY b.budget_id DESC`;
    db.query(query, [userId, DEFAULT_BUDGET_NAME], (err, result) => {
      if (err) {
        console.error("SQL Error in getBudgets:", err.message);
        return res.status(500).json(err);
      }
      return res.json(result.map((budgetRow) => {
        const resolvedDates = getResolvedDateRange(budgetRow.start_date, budgetRow.end_date);
        return { ...budgetRow, start_date: resolvedDates.startDate, end_date: resolvedDates.endDate };
      }));
    });
  } catch (err) {
    console.error("Budget lifecycle error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
exports.addBudget = async (req, res) => {
  const { name, amount, icon, user_id, month, color, start_date, end_date } = req.body;
  if (!name || !amount) {
    return res.status(400).json({ error: "Name and amount are required" });
  }
  if (start_date && end_date && start_date > end_date) {
    return res.status(400).json({ error: "End date must be after start date" });
  }
  const resolvedUserId = user_id || DEFAULT_USER_ID;
  try {
    const resolvedDates = getResolvedDateRange(start_date, end_date);
    const resolvedMonth =
      Number(month) > 0 ? Number(month) : getMonthNumberFromDate(resolvedDates.startDate);
    const hasCategoryIdColumn = await hasBudgetCategoryIdColumn();
    const categoryId = await findOrCreateExpenseCategory(resolvedUserId, name, icon);
    const query = hasCategoryIdColumn
      ? `INSERT INTO budgets (name, amount, icon, user_id, category_id, month, spent, color, start_date, end_date, is_system_generated)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0)`
      : `INSERT INTO budgets (name, amount, icon, user_id, month, spent, color, start_date, end_date, is_system_generated)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 0)`;
    const values = hasCategoryIdColumn
      ? [
          name, amount, icon, resolvedUserId, categoryId, resolvedMonth,
          color || DEFAULT_BUDGET_COLOR, resolvedDates.startDate, resolvedDates.endDate
        ]
      : [
          name, amount, icon, resolvedUserId, resolvedMonth,
          color || DEFAULT_BUDGET_COLOR, resolvedDates.startDate, resolvedDates.endDate
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
        color: color || DEFAULT_BUDGET_COLOR,
        start_date: resolvedDates.startDate,
        end_date: resolvedDates.endDate
      });
    });
  } catch (err) {
    console.error("Budget category sync error:", err.message);
    return res.status(400).json({ error: err.message });
  }
};
exports.editBudget = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { budget_id, amount, name, start_date, end_date } = req.body;
    const updates = [];
    const values = [];
    const parsedBudgetId = Number(budget_id);
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
      updates.push("month = ?");
      values.push(getMonthNumberFromDate(resolvedDates.startDate));
    }
    if (end_date !== undefined) {
      updates.push("end_date = ?");
      values.push(resolvedDates.endDate);
    }
    if (!Number.isInteger(parsedBudgetId) || parsedBudgetId <= 0 || updates.length === 0) {
      return res.status(400).json({ error: "budget_id and at least one field are required" });
    }
    if (name !== undefined) {
      const hasCategoryIdColumn = await hasBudgetCategoryIdColumn();
      const categoryId = await findOrCreateExpenseCategory(userId, name, null);
      if (hasCategoryIdColumn) {
        updates.push("category_id = ?");
        values.push(categoryId);
      }
    }
    const query = `UPDATE budgets SET ${updates.join(", ")} WHERE budget_id = ?`;
    values.push(parsedBudgetId);
    const [result] = await db.promise().query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }
    const [updatedRows] = await db.promise().query(
      `
        SELECT budget_id, name, amount, icon, color, start_date, end_date, user_id, month,
               COALESCE(is_system_generated, 0) AS is_system_generated
        FROM budgets
        WHERE budget_id = ?
        LIMIT 1
      `,
      [parsedBudgetId]
    );
    const updatedBudget = updatedRows[0]
      ? {
          ...updatedRows[0],
          ...getResolvedDateRange(updatedRows[0].start_date, updatedRows[0].end_date)
        }
      : null;
    return res.json({
      message: "Budget updated successfully",
      budget: updatedBudget
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
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

