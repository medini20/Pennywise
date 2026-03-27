const db = require("../../config/db");
const emailService = require("../../utils/emailService");

const DEFAULT_USER_ID = 1;
const DEFAULT_BUDGET_AMOUNT = 5000;
const DEFAULT_BUDGET_NAME = "Monthly Budget";

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

const formatDateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthWindow = (month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return {
    startDate: formatDateOnly(startDate),
    endDate: formatDateOnly(endDate)
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

// Alerts are tied to the dedicated monthly budget row, not the category budget cards.
// Querying that row directly keeps the alerts page stable even with the newer budgets schema.
const getBudgetForMonth = async (userId, month) => {
  const rows = await runQuery(
    `
      SELECT
        budget_id,
        user_id,
        name,
        icon,
        amount,
        spent,
        month,
        color,
        COALESCE(is_system_generated, 0) AS is_system_generated,
        start_date,
        end_date
      FROM budgets
      WHERE user_id = ?
        AND month = ?
        AND (
          COALESCE(is_system_generated, 0) = 1
          OR LOWER(TRIM(COALESCE(name, ''))) = LOWER(TRIM(?))
        )
      ORDER BY COALESCE(is_system_generated, 0) DESC, budget_id DESC
      LIMIT 1
    `,
    [userId, month, DEFAULT_BUDGET_NAME]
  );

  return rows[0] || null;
};

const ensureBudgetForMonth = async (userId, month, year) => {
  const existingBudget = await getBudgetForMonth(userId, month);
  if (existingBudget) {
    return existingBudget;
  }

  const monthWindow = getMonthWindow(month, year);
  const result = await runQuery(
    `
      INSERT INTO budgets (
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
      )
      VALUES (?, ?, NULL, ?, 0, ?, '#ffcc00', 1, ?, ?)
    `,
    [userId, DEFAULT_BUDGET_NAME, DEFAULT_BUDGET_AMOUNT, month, monthWindow.startDate, monthWindow.endDate]
  );

  return {
    budget_id: result.insertId,
    user_id: userId,
    name: DEFAULT_BUDGET_NAME,
    icon: null,
    amount: DEFAULT_BUDGET_AMOUNT,
    spent: 0,
    month,
    color: "#ffcc00",
    is_system_generated: 1,
    start_date: monthWindow.startDate,
    end_date: monthWindow.endDate
  };
};

const getCurrentSpending = async (userId, month, year) => {
  const rows = await runQuery(
    `
      SELECT COALESCE(SUM(amount), 0) AS total_spent
      FROM transactions
      WHERE user_id = ?
        AND type = 'expense'
        AND MONTH(transaction_date) = ?
        AND YEAR(transaction_date) = ?
    `,
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
    const { month, year } = getCurrentPeriod();
    const monthWindow = getMonthWindow(month, year);
    const existingBudget = await getBudgetForMonth(userId, month);

    if (existingBudget) {
      await runQuery(
        `
          UPDATE budgets
          SET
            amount = ?,
            name = ?,
            is_system_generated = 1,
            start_date = ?,
            end_date = ?
          WHERE budget_id = ?
        `,
        [amount, DEFAULT_BUDGET_NAME, monthWindow.startDate, monthWindow.endDate, existingBudget.budget_id]
      );

      return res.json({
        message: "Budget updated successfully!",
        budget_id: existingBudget.budget_id,
        amount,
        name: DEFAULT_BUDGET_NAME,
        icon: existingBudget.icon
      });
    }

    const result = await runQuery(
      `
        INSERT INTO budgets (
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
        )
        VALUES (?, ?, NULL, ?, 0, ?, '#ffcc00', 1, ?, ?)
      `,
      [userId, DEFAULT_BUDGET_NAME, amount, month, monthWindow.startDate, monthWindow.endDate]
    );

    return res.status(201).json({
      message: "Budget saved successfully!",
      budget_id: result.insertId,
      amount,
      name: DEFAULT_BUDGET_NAME,
      icon: null
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
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
    const { month, year } = getCurrentPeriod();
    const currentBudget = await ensureBudgetForMonth(userId, month, year);
    const budgetId = currentBudget.budget_id;

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
