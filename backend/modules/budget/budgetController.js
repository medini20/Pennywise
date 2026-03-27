const db = require("../../config/db");

const DEFAULT_USER_ID = 1;
const DEFAULT_BUDGET_NAME = "Monthly Budget";

const normalizeName = (value) =>
  typeof value === "string" ? value.trim() : "";

const toPositiveAmount = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const getResolvedUserId = (rawUserId) => {
  const parsedUserId = Number(rawUserId);
  return Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : DEFAULT_USER_ID;
};

const getCurrentMonth = () => new Date().getMonth() + 1;

const ensureCategoryMirror = async (userId, budgetName, budgetIcon) => {
  if (!budgetName) {
    return;
  }

  const [existingCategories] = await db.promise().query(
    `
      SELECT category_id, icon
      FROM categories
      WHERE user_id = ?
        AND LOWER(TRIM(name)) = LOWER(TRIM(?))
      LIMIT 1
    `,
    [userId, budgetName]
  );

  if (existingCategories.length === 0) {
    await db.promise().query(
      `
        INSERT INTO categories (user_id, name, type, icon)
        VALUES (?, ?, 'expense', ?)
      `,
      [userId, budgetName, budgetIcon || null]
    );
    return;
  }

  if (budgetIcon && !existingCategories[0].icon) {
    await db.promise().query(
      `
        UPDATE categories
        SET icon = ?
        WHERE category_id = ?
      `,
      [budgetIcon, existingCategories[0].category_id]
    );
  }
};

// The live budgets table stores the category label directly on the row.
// Keeping this controller aligned with the real schema avoids the add/list crashes.
exports.getBudgets = async (req, res) => {
  const userId = req.query?.user_id ? getResolvedUserId(req.query.user_id) : null;
  const query = `
    SELECT
      budget_id,
      user_id,
      name,
      icon,
      amount,
      spent,
      month,
      color,
      is_system_generated,
      start_date,
      end_date
    FROM budgets
    WHERE COALESCE(is_system_generated, 0) = 0
      ${userId ? "AND user_id = ?" : ""}
      AND LOWER(TRIM(COALESCE(name, ''))) <> LOWER(TRIM(?))
    ORDER BY month DESC, budget_id DESC
  `;
  const queryParams = userId ? [userId, DEFAULT_BUDGET_NAME] : [DEFAULT_BUDGET_NAME];

  try {
    const [rows] = await db.promise().query(query, queryParams);
    return res.json(rows);
  } catch (error) {
    console.error("SQL Error in getBudgets:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

exports.addBudget = async (req, res) => {
  const body = req.body || {};
  const budgetName = normalizeName(body.name);
  const budgetAmount = toPositiveAmount(body.amount);
  const budgetIcon = typeof body.icon === "string" ? body.icon.trim() : null;
  const userId = getResolvedUserId(body.user_id);
  const month = Number.isInteger(Number(body.month)) && Number(body.month) > 0
    ? Number(body.month)
    : getCurrentMonth();

  if (!budgetName || !budgetAmount) {
    return res.status(400).json({ error: "Name and amount are required." });
  }

  try {
    await ensureCategoryMirror(userId, budgetName, budgetIcon);

    const [result] = await db.promise().query(
      `
        INSERT INTO budgets (
          user_id,
          name,
          icon,
          amount,
          month,
          is_system_generated,
          spent
        )
        VALUES (?, ?, ?, ?, ?, 0, 0)
      `,
      [userId, budgetName, budgetIcon, budgetAmount, month]
    );

    return res.status(201).json({
      budget_id: result.insertId,
      user_id: userId,
      name: budgetName,
      icon: budgetIcon,
      amount: budgetAmount,
      spent: 0,
      month,
      is_system_generated: 0
    });
  } catch (error) {
    console.error("SQL Error in addBudget:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

exports.editBudget = async (req, res) => {
  const body = req.body || {};
  const budgetId = Number(body.budget_id);
  const budgetName = normalizeName(body.name);
  const budgetAmount = toPositiveAmount(body.amount);

  if (!Number.isInteger(budgetId) || budgetId <= 0 || !budgetAmount) {
    return res.status(400).json({ error: "A valid budget id and amount are required." });
  }

  try {
    const [existingBudgets] = await db.promise().query(
      `
        SELECT budget_id, user_id, icon
        FROM budgets
        WHERE budget_id = ?
        LIMIT 1
      `,
      [budgetId]
    );

    if (existingBudgets.length === 0) {
      return res.status(404).json({ error: "Budget not found." });
    }

    const existingBudget = existingBudgets[0];
    const nextBudgetName = budgetName || DEFAULT_BUDGET_NAME;

    await db.promise().query(
      `
        UPDATE budgets
        SET name = ?, amount = ?
        WHERE budget_id = ?
      `,
      [nextBudgetName, budgetAmount, budgetId]
    );

    await ensureCategoryMirror(existingBudget.user_id, nextBudgetName, existingBudget.icon);

    return res.json({ message: "Budget updated successfully" });
  } catch (error) {
    console.error("SQL Error in editBudget:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteBudget = async (req, res) => {
  const budgetId = Number(req.params.id);

  if (!Number.isInteger(budgetId) || budgetId <= 0) {
    return res.status(400).json({ error: "A valid budget id is required." });
  }

  try {
    await db.promise().query("DELETE FROM alerts WHERE budget_id = ?", [budgetId]);
    await db.promise().query("DELETE FROM budgets WHERE budget_id = ?", [budgetId]);

    return res.json({ message: "Budget deleted successfully" });
  } catch (error) {
    console.error("SQL Error in deleteBudget:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
