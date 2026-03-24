const db = require("../../config/db");
const emailService = require("../../utils/emailService");

const DEFAULT_USER_ID = 1;
const DEFAULT_BUDGET_AMOUNT = 5000;

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

const getCurrentPeriod = () => {
  const now = new Date();

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
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

const toPositiveNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const toPercentage = (value) => {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 && parsedValue <= 100
    ? parsedValue
    : null;
};

const toNonNegativeNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
};

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getBudgetForMonth = async (userId, month) => {
  const rows = await runQuery(
    "SELECT budget_id, user_id, category_id, amount, month FROM budgets WHERE user_id = ? AND month = ? ORDER BY budget_id DESC LIMIT 1",
    [userId, month]
  );

  return rows[0] || null;
};

const resolveCategoryId = async (userId, requestedCategoryId) => {
  const parsedCategoryId = Number(requestedCategoryId);
  if (Number.isInteger(parsedCategoryId) && parsedCategoryId > 0) {
    return parsedCategoryId;
  }

  const userCategoryRows = await runQuery(
    "SELECT category_id FROM categories WHERE user_id = ? ORDER BY category_id ASC LIMIT 1",
    [userId]
  );

  if (userCategoryRows.length > 0) {
    return userCategoryRows[0].category_id;
  }

  const fallbackCategoryRows = await runQuery(
    "SELECT category_id FROM categories ORDER BY category_id ASC LIMIT 1"
  );

  if (fallbackCategoryRows.length > 0) {
    return fallbackCategoryRows[0].category_id;
  }

  throw createHttpError(400, "Create at least one category before saving a budget.");
};

const getCurrentSpending = async (userId, month, year) => {
  const rows = await runQuery(
    "SELECT COALESCE(SUM(amount), 0) AS total_spent FROM transactions WHERE user_id = ? AND type = 'expense' AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?",
    [userId, month, year]
  );

  return Number(rows[0]?.total_spent || 0);
};

const getCurrentSpendingOverride = (req) => {
  const body = req.body || {};
  const query = req.query || {};

  if (
    body.current_spending === undefined &&
    query.current_spending === undefined
  ) {
    return null;
  }

  return toNonNegativeNumber(body.current_spending ?? query.current_spending);
};

const getAlertsForBudget = async (budgetId) => {
  if (!budgetId) {
    return [];
  }

  const rows = await runQuery(
    "SELECT alert_id, threshold_percent FROM alerts WHERE budget_id = ? ORDER BY threshold_percent ASC",
    [budgetId]
  );

  return rows.map((row) => ({
    id: row.alert_id,
    percentage: row.threshold_percent
  }));
};

const buildAlertSummary = async (userId, currentSpendingOverride = null) => {
  const { month, year } = getCurrentPeriod();
  const budgetRow = await getBudgetForMonth(userId, month);
  const currentSpending =
    currentSpendingOverride !== null
      ? currentSpendingOverride
      : await getCurrentSpending(userId, month, year);

  if (!budgetRow) {
    const spentPercentage =
      DEFAULT_BUDGET_AMOUNT > 0
        ? Number(((currentSpending / DEFAULT_BUDGET_AMOUNT) * 100).toFixed(2))
        : 0;

    return {
      budget: DEFAULT_BUDGET_AMOUNT,
      budget_id: null,
      current_spending: currentSpending,
      spent_percentage: spentPercentage,
      alerts: [],
      triggered_alerts: []
    };
  }

  const budgetAmount = Number(budgetRow.amount);
  const spentPercentage =
    budgetAmount > 0
      ? Number(((currentSpending / budgetAmount) * 100).toFixed(2))
      : 0;

  const alerts = (await getAlertsForBudget(budgetRow.budget_id)).map((alert) => ({
    ...alert,
    triggered: spentPercentage >= alert.percentage
  }));

  return {
    budget: budgetAmount,
    budget_id: budgetRow.budget_id,
    current_spending: currentSpending,
    spent_percentage: spentPercentage,
    alerts,
    triggered_alerts: alerts.filter((alert) => alert.triggered)
  };
};

exports.saveBudget = async (req, res) => {
  try {
    const body = req.body || {};
    const amount = toPositiveNumber(body.amount);
    if (!amount) {
      return res.status(400).json({ error: "A positive budget amount is required." });
    }

    const userId = getUserId(req);
    const { month } = getCurrentPeriod();
    const categoryId = await resolveCategoryId(userId, body.category_id);
    const existingBudget = await getBudgetForMonth(userId, month);

    if (existingBudget) {
      await runQuery(
        "UPDATE budgets SET amount = ?, category_id = ? WHERE budget_id = ?",
        [amount, categoryId, existingBudget.budget_id]
      );

      return res.json({
        message: "Budget updated successfully!",
        budget_id: existingBudget.budget_id,
        amount
      });
    }

    const result = await runQuery(
      "INSERT INTO budgets (user_id, category_id, amount, month) VALUES (?, ?, ?, ?)",
      [userId, categoryId, amount, month]
    );

    return res.status(201).json({
      message: "Budget saved successfully!",
      budget_id: result.insertId,
      amount
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.createAlert = async (req, res) => {
  try {
    const body = req.body || {};
    const thresholdPercent = toPercentage(body.threshold_percent);
    if (!thresholdPercent) {
      return res
        .status(400)
        .json({ error: "threshold_percent must be an integer from 1 to 100." });
    }

    const userId = getUserId(req);
    const { month } = getCurrentPeriod();
    const currentBudget = await getBudgetForMonth(userId, month);
    const requestedBudgetId = Number(body.budget_id);
    const budgetId =
      Number.isInteger(requestedBudgetId) && requestedBudgetId > 0
        ? requestedBudgetId
        : currentBudget?.budget_id;

    if (!budgetId) {
      return res.status(400).json({ error: "Save a budget before creating alerts." });
    }

    const matchingBudgets = await runQuery(
      "SELECT budget_id FROM budgets WHERE budget_id = ? AND user_id = ? LIMIT 1",
      [budgetId, userId]
    );

    if (matchingBudgets.length === 0) {
      return res.status(404).json({ error: "Budget not found for this user." });
    }

    const existingAlerts = await runQuery(
      "SELECT alert_id FROM alerts WHERE budget_id = ? AND threshold_percent = ? LIMIT 1",
      [budgetId, thresholdPercent]
    );

    if (existingAlerts.length > 0) {
      return res.status(409).json({ error: "An alert already exists for this threshold." });
    }

    const result = await runQuery(
      "INSERT INTO alerts (user_id, budget_id, threshold_percent) VALUES (?, ?, ?)",
      [userId, budgetId, thresholdPercent]
    );

    return res.status(201).json({
      message: "Alert added!",
      alert_id: result.insertId,
      budget_id: budgetId,
      threshold_percent: thresholdPercent
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.getAlertData = async (req, res) => {
  try {
    const userId = getUserId(req);
    const summary = await buildAlertSummary(
      userId,
      getCurrentSpendingOverride(req)
    );

    return res.json(summary);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.checkTriggeredAlerts = async (req, res) => {
  try {
    const body = req.body || {};
    const query = req.query || {};
    const userId = getUserId(req);
    const sendEmail = body.send_email === true || query.send_email === "true";
    const email = body.email || query.email;
    const summary = await buildAlertSummary(
      userId,
      getCurrentSpendingOverride(req)
    );

    let emailSent = false;

    if (sendEmail && email && summary.triggered_alerts.length > 0) {
      emailSent = await emailService.sendBudgetAlert(email, {
        budgetAmount: summary.budget,
        currentSpending: summary.current_spending,
        triggeredAlerts: summary.triggered_alerts
      });
    }

    return res.json({
      ...summary,
      email_sent: emailSent
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.deleteAlert = async (req, res) => {
  try {
    const userId = getUserId(req);
    const alertId = Number(req.params.id);

    if (!Number.isInteger(alertId) || alertId <= 0) {
      return res.status(400).json({ error: "A valid alert id is required." });
    }

    const existingAlerts = await runQuery(
      "SELECT alert_id FROM alerts WHERE alert_id = ? AND user_id = ? LIMIT 1",
      [alertId, userId]
    );

    if (existingAlerts.length === 0) {
      return res.status(404).json({ error: "Alert not found." });
    }

    await runQuery("DELETE FROM alerts WHERE alert_id = ?", [alertId]);

    return res.json({ message: "Alert deleted successfully.", alert_id: alertId });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};
