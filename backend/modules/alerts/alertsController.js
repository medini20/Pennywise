const db = require("../../config/db");
const emailService = require("../../utils/emailService");
const { syncBudgetLifecycle } = require("../budget/budgetLifecycle");

const DEFAULT_USER_ID = 1;
const DEFAULT_BUDGET_AMOUNT = 5000;
const DEFAULT_BUDGET_NAME = "Monthly Budget";
const DEFAULT_BUDGET_COLOR = "#ffcc00";

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

const getCurrentPeriod = () => {
  const now = new Date();

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
  };
};

const getDefaultBudgetPeriod = (month, year) => ({
  startDate: `${year}-${padNumber(month)}-01`,
  endDate: formatDateValue(new Date(year, month, 0))
});

const normalizeBudgetName = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isMonthlyBudgetRow = (budgetRow) =>
  Number(budgetRow?.is_system_generated) === 1 ||
  normalizeBudgetName(budgetRow?.name) === normalizeBudgetName(DEFAULT_BUDGET_NAME);

const getResolvedBudgetPeriod = (budgetRow, month, year) => {
  const defaultPeriod = getDefaultBudgetPeriod(month, year);

  return {
    startDate: formatDateValue(budgetRow?.start_date) || defaultPeriod.startDate,
    endDate: formatDateValue(budgetRow?.end_date) || defaultPeriod.endDate
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

const toOptionalText = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const toHexColor = (value) => {
  const parsedValue = toOptionalText(value);
  return parsedValue && /^#[0-9a-fA-F]{6}$/.test(parsedValue) ? parsedValue : null;
};

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getBudgetPeriodInput = (body, existingBudget, month, year) => {
  const defaultPeriod = getDefaultBudgetPeriod(month, year);
  const startDate =
    formatDateValue(body.start_date) ||
    formatDateValue(existingBudget?.start_date) ||
    defaultPeriod.startDate;
  const endDate =
    formatDateValue(body.end_date) ||
    formatDateValue(existingBudget?.end_date) ||
    defaultPeriod.endDate;

  if (startDate > endDate) {
    throw createHttpError(400, "Start date must be on or before end date.");
  }

  return { startDate, endDate };
};

const getMonthlyBudgetForMonth = async (userId, month) => {
  const rows = await runQuery(
    `SELECT budget_id, user_id, name, icon, amount, spent, month, color, start_date, end_date,
            COALESCE(is_system_generated, 0) AS is_system_generated
     FROM budgets
     WHERE user_id = ?
       AND month = ?
       AND (
         COALESCE(is_system_generated, 0) = 1
         OR LOWER(TRIM(name)) = LOWER(TRIM(?))
       )
     ORDER BY COALESCE(is_system_generated, 0) DESC, budget_id DESC
     LIMIT 1`,
    [userId, month, DEFAULT_BUDGET_NAME]
  );

  return rows[0] || null;
};

const ensureBudgetForMonth = async (userId, month, year) => {
  await syncBudgetLifecycle(userId);
  const existingBudget = await getMonthlyBudgetForMonth(userId, month);

  if (existingBudget) {
    const resolvedPeriod = getResolvedBudgetPeriod(existingBudget, month, year);
    const hasStartDate = Boolean(formatDateValue(existingBudget.start_date));
    const hasEndDate = Boolean(formatDateValue(existingBudget.end_date));

    if (!hasStartDate || !hasEndDate || !isMonthlyBudgetRow(existingBudget)) {
      await runQuery(
        `UPDATE budgets
         SET name = ?, start_date = ?, end_date = ?, is_system_generated = 1
         WHERE budget_id = ?`,
        [DEFAULT_BUDGET_NAME, resolvedPeriod.startDate, resolvedPeriod.endDate, existingBudget.budget_id]
      );
    }

    return {
      ...existingBudget,
      name: DEFAULT_BUDGET_NAME,
      start_date: resolvedPeriod.startDate,
      end_date: resolvedPeriod.endDate,
      is_system_generated: 1
    };
  }

  const defaultPeriod = getDefaultBudgetPeriod(month, year);
  const result = await runQuery(
    `INSERT INTO budgets
      (user_id, name, icon, amount, spent, month, color, start_date, end_date, is_system_generated)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 1)`,
    [
      userId,
      DEFAULT_BUDGET_NAME,
      null,
      DEFAULT_BUDGET_AMOUNT,
      month,
      DEFAULT_BUDGET_COLOR,
      defaultPeriod.startDate,
      defaultPeriod.endDate
    ]
  );

  return {
    budget_id: result.insertId,
    user_id: userId,
    name: DEFAULT_BUDGET_NAME,
    icon: null,
    amount: DEFAULT_BUDGET_AMOUNT,
    spent: 0,
    month,
    color: DEFAULT_BUDGET_COLOR,
    start_date: defaultPeriod.startDate,
    end_date: defaultPeriod.endDate,
    is_system_generated: 1
  };
};

const getBudgetDraft = (body, existingBudget) => ({
  icon:
    body.icon !== undefined
      ? toOptionalText(body.icon)
      : existingBudget?.icon ?? null,
  color: toHexColor(body.color) || existingBudget?.color || DEFAULT_BUDGET_COLOR
});

const getCurrentSpending = async (userId, startDate, endDate) => {
  const rows = await runQuery(
    `SELECT COALESCE(SUM(amount), 0) AS total_spent
     FROM transactions
     WHERE user_id = ?
       AND type = 'expense'
       AND DATE(transaction_date) BETWEEN ? AND ?`,
    [userId, startDate, endDate]
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

const getCategoryBudgets = async (userId) => {
  const rows = await runQuery(
    `SELECT budget_id, user_id, name, icon, amount, spent, month, color, start_date, end_date,
            COALESCE(is_system_generated, 0) AS is_system_generated
     FROM budgets
     WHERE user_id = ?
       AND COALESCE(is_system_generated, 0) = 0
       AND LOWER(TRIM(name)) <> LOWER(TRIM(?))
     ORDER BY budget_id DESC`,
    [userId, DEFAULT_BUDGET_NAME]
  );

  const { month, year } = getCurrentPeriod();

  return rows.map((budgetRow) => {
    const resolvedPeriod = getResolvedBudgetPeriod(budgetRow, month, year);

    return {
      ...budgetRow,
      start_date: resolvedPeriod.startDate,
      end_date: resolvedPeriod.endDate
    };
  });
};

const getCategoryBudgetSpending = async (userId, budgetRow) => {
  const { month, year } = getCurrentPeriod();
  const budgetPeriod = getResolvedBudgetPeriod(budgetRow, month, year);
  const budgetIcon = toOptionalText(budgetRow?.icon);
  const budgetName = toOptionalText(budgetRow?.name) || "";
  const params = [
    userId,
    budgetPeriod.startDate,
    budgetPeriod.endDate,
    budgetIcon,
    budgetIcon,
    budgetIcon,
    budgetName,
    budgetName
  ];

  const rows = await runQuery(
    `SELECT COALESCE(SUM(t.amount), 0) AS total_spent
     FROM transactions t
     LEFT JOIN categories c
       ON c.category_id = t.category_id
     WHERE t.user_id = ?
       AND t.type = 'expense'
       AND DATE(t.transaction_date) BETWEEN ? AND ?
       AND (
         (
           ? IS NOT NULL
           AND TRIM(?) <> ''
           AND c.icon IS NOT NULL
           AND TRIM(c.icon) <> ''
           AND TRIM(c.icon) = TRIM(?)
         )
         OR LOWER(TRIM(COALESCE(c.name, ''))) = LOWER(TRIM(?))
         OR LOWER(TRIM(COALESCE(t.description, ''))) = LOWER(TRIM(?))
       )`,
    params
  );

  return Number(rows[0]?.total_spent || 0);
};

const getAlertsForUser = async (userId) => {
  const rows = await runQuery(
    `SELECT
        a.alert_id,
        a.user_id,
        a.budget_id,
        a.threshold_percent,
        b.name,
        b.icon,
        b.amount,
        b.color,
        b.start_date,
        b.end_date,
        COALESCE(b.is_system_generated, 0) AS is_system_generated
     FROM alerts a
     INNER JOIN budgets b
       ON b.budget_id = a.budget_id
     WHERE a.user_id = ?
     ORDER BY a.threshold_percent ASC, a.alert_id ASC`,
    [userId]
  );

  return rows;
};

const buildAlertSummary = async (userId, currentSpendingOverride = null) => {
  const { month, year } = getCurrentPeriod();
  const monthlyBudgetRow = await ensureBudgetForMonth(userId, month, year);
  const monthlyBudgetPeriod = getResolvedBudgetPeriod(monthlyBudgetRow, month, year);
  const monthlyBudgetAmount = Number(monthlyBudgetRow.amount || DEFAULT_BUDGET_AMOUNT);
  const monthlyBudgetSpending =
    currentSpendingOverride !== null
      ? currentSpendingOverride
      : await getCurrentSpending(
          userId,
          monthlyBudgetPeriod.startDate,
          monthlyBudgetPeriod.endDate
        );
  const alertRows = await getAlertsForUser(userId);
  const categoryBudgets = await getCategoryBudgets(userId);
  const spendingByBudgetId = new Map([[monthlyBudgetRow.budget_id, monthlyBudgetSpending]]);

  const alerts = await Promise.all(
    alertRows.map(async (alertRow) => {
      if (!spendingByBudgetId.has(alertRow.budget_id)) {
        const nextSpending = isMonthlyBudgetRow(alertRow)
          ? monthlyBudgetSpending
          : await getCategoryBudgetSpending(userId, alertRow);

        spendingByBudgetId.set(alertRow.budget_id, nextSpending);
      }

      const budgetAmount = Number(alertRow.amount || 0);
      const currentSpending = Number(spendingByBudgetId.get(alertRow.budget_id) || 0);
      const spentPercentage =
        budgetAmount > 0
          ? Number(((currentSpending / budgetAmount) * 100).toFixed(2))
          : 0;
      const budgetPeriod = getResolvedBudgetPeriod(alertRow, month, year);
      const scope = isMonthlyBudgetRow(alertRow) ? "overall" : "category";

      return {
        id: alertRow.alert_id,
        percentage: alertRow.threshold_percent,
        budget_id: alertRow.budget_id,
        budget_name: scope === "overall" ? DEFAULT_BUDGET_NAME : alertRow.name,
        budget_icon: alertRow.icon,
        budget_color: alertRow.color || DEFAULT_BUDGET_COLOR,
        budget_amount: budgetAmount,
        current_spending: currentSpending,
        spent_percentage: spentPercentage,
        triggered: spentPercentage >= alertRow.threshold_percent,
        scope,
        start_date: budgetPeriod.startDate,
        end_date: budgetPeriod.endDate
      };
    })
  );

  const sortedAlerts = alerts.slice().sort((left, right) => {
    if (left.percentage !== right.percentage) {
      return left.percentage - right.percentage;
    }

    if (left.scope !== right.scope) {
      return left.scope === "overall" ? -1 : 1;
    }

    return String(left.budget_name || "").localeCompare(String(right.budget_name || ""));
  });

  return {
    budget: monthlyBudgetAmount,
    budget_id: monthlyBudgetRow.budget_id,
    current_spending: monthlyBudgetSpending,
    spent_percentage:
      monthlyBudgetAmount > 0
        ? Number(((monthlyBudgetSpending / monthlyBudgetAmount) * 100).toFixed(2))
        : 0,
    start_date: monthlyBudgetPeriod.startDate,
    end_date: monthlyBudgetPeriod.endDate,
    alerts: sortedAlerts,
    triggered_alerts: sortedAlerts.filter((alert) => alert.triggered),
    available_category_budgets: categoryBudgets.map((budgetRow) => ({
      budget_id: budgetRow.budget_id,
      name: budgetRow.name,
      icon: budgetRow.icon,
      amount: Number(budgetRow.amount || 0),
      color: budgetRow.color || DEFAULT_BUDGET_COLOR,
      start_date: budgetRow.start_date,
      end_date: budgetRow.end_date
    }))
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
    await syncBudgetLifecycle(userId);
    const existingBudget = await getMonthlyBudgetForMonth(userId, month);
    const budgetDraft = getBudgetDraft(body, existingBudget);
    const budgetPeriod = getBudgetPeriodInput(body, existingBudget, month, year);

    if (existingBudget) {
      await runQuery(
        `UPDATE budgets
         SET amount = ?, name = ?, icon = ?, color = ?, start_date = ?, end_date = ?, is_system_generated = 1
         WHERE budget_id = ?`,
        [
          amount,
          DEFAULT_BUDGET_NAME,
          budgetDraft.icon,
          budgetDraft.color,
          budgetPeriod.startDate,
          budgetPeriod.endDate,
          existingBudget.budget_id
        ]
      );

      return res.json({
        message: "Budget updated successfully!",
        budget_id: existingBudget.budget_id,
        amount,
        name: DEFAULT_BUDGET_NAME,
        icon: budgetDraft.icon,
        color: budgetDraft.color,
        start_date: budgetPeriod.startDate,
        end_date: budgetPeriod.endDate
      });
    }

    const result = await runQuery(
      `INSERT INTO budgets
        (user_id, name, icon, amount, spent, month, color, start_date, end_date, is_system_generated)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 1)`,
      [
        userId,
        DEFAULT_BUDGET_NAME,
        budgetDraft.icon,
        amount,
        month,
        budgetDraft.color,
        budgetPeriod.startDate,
        budgetPeriod.endDate
      ]
    );

    return res.status(201).json({
      message: "Budget saved successfully!",
      budget_id: result.insertId,
      amount,
      name: DEFAULT_BUDGET_NAME,
      icon: budgetDraft.icon,
      color: budgetDraft.color,
      start_date: budgetPeriod.startDate,
      end_date: budgetPeriod.endDate
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
    const { month, year } = getCurrentPeriod();
    const currentBudget = await ensureBudgetForMonth(userId, month, year);
    const requestedBudgetId = Number(body.budget_id);
    const budgetId =
      Number.isInteger(requestedBudgetId) && requestedBudgetId > 0
        ? requestedBudgetId
        : currentBudget?.budget_id;

    const matchingBudgets = await runQuery(
      `SELECT budget_id, name, icon, amount, color, start_date, end_date,
              COALESCE(is_system_generated, 0) AS is_system_generated
       FROM budgets
       WHERE budget_id = ? AND user_id = ?
       LIMIT 1`,
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

    const budgetRow = matchingBudgets[0];

    return res.status(201).json({
      message: "Alert added!",
      alert_id: result.insertId,
      budget_id: budgetId,
      threshold_percent: thresholdPercent,
      budget_name: isMonthlyBudgetRow(budgetRow) ? DEFAULT_BUDGET_NAME : budgetRow.name,
      budget_icon: budgetRow.icon,
      scope: isMonthlyBudgetRow(budgetRow) ? "overall" : "category"
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
