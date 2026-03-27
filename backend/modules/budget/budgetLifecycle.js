const db = require("../../config/db");

const DEFAULT_BUDGET_AMOUNT = 5000;
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

const hasBudgetCategoryIdColumn = async () => {
  if (budgetCategoryIdColumnExists !== null) {
    return budgetCategoryIdColumnExists;
  }

  const rows = await runQuery(
    `
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'budgets'
        AND COLUMN_NAME = 'category_id'
      LIMIT 1
    `
  );

  budgetCategoryIdColumnExists = rows.length > 0;
  return budgetCategoryIdColumnExists;
};

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

const ensureExpenseCategory = async (userId, name, icon = null) => {
  const rows = await runQuery(
    `
      SELECT category_id
      FROM categories
      WHERE user_id = ?
        AND LOWER(TRIM(name)) = LOWER(TRIM(?))
      LIMIT 1
    `,
    [userId, name]
  );

  if (rows.length > 0) {
    return rows[0].category_id;
  }

  const result = await runQuery(
    `
      INSERT INTO categories (user_id, name, type, icon)
      VALUES (?, ?, 'expense', ?)
    `,
    [userId, name, icon]
  );

  return result.insertId;
};

const getMonthlyBudgetCategoryId = async (userId) => {
  if (!(await hasBudgetCategoryIdColumn())) {
    return null;
  }

  return ensureExpenseCategory(userId, DEFAULT_BUDGET_NAME, null);
};

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
  const monthlyBudgetCategoryId = await getMonthlyBudgetCategoryId(userId);

  if (monthlyBudgetCategoryId !== null) {
    await runQuery(
      `UPDATE budgets
       SET name = ?, category_id = ?, month = ?, spent = 0, start_date = ?, end_date = ?, is_system_generated = 1
       WHERE budget_id = ?`,
      [
        DEFAULT_BUDGET_NAME,
        monthlyBudgetCategoryId,
        month,
        currentRange.startDate,
        currentRange.endDate,
        monthlyBudget.budget_id
      ]
    );
  } else {
    await runQuery(
      `UPDATE budgets
       SET name = ?, month = ?, spent = 0, start_date = ?, end_date = ?, is_system_generated = 1
       WHERE budget_id = ?`,
      [
        DEFAULT_BUDGET_NAME,
        month,
        currentRange.startDate,
        currentRange.endDate,
        monthlyBudget.budget_id
      ]
    );
  }

  return {
    ...monthlyBudget,
    name: DEFAULT_BUDGET_NAME,
    month,
    start_date: currentRange.startDate,
    end_date: currentRange.endDate,
    is_system_generated: 1
  };
};

module.exports = {
  DEFAULT_BUDGET_AMOUNT,
  DEFAULT_BUDGET_COLOR,
  DEFAULT_BUDGET_NAME,
  formatDateValue,
  getCurrentMonthDateRange,
  getCurrentPeriod,
  getMonthlyBudgetCategoryId,
  getResolvedDateRange,
  hasBudgetCategoryIdColumn,
  runQuery,
  syncBudgetLifecycle
};
