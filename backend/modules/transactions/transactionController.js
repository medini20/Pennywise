const db = require("../../config/db");

const ALLOWED_RECURRING_FREQUENCIES = new Set(["Weekly", "Monthly", "Custom"]);

const normalizeCategoryName = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeCategoryIcon = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeCustomIntervalDays = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return null;
  }

  return Math.floor(numericValue);
};

const createUtcDate = (dateValue) => {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const formatUtcDate = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDateValue = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayDateValue = () => formatUtcDate(new Date());

const calculateNextOccurrenceDate = (dateValue, frequency, customIntervalDays) => {
  const nextDate = createUtcDate(dateValue);

  if (frequency === "Weekly") {
    nextDate.setUTCDate(nextDate.getUTCDate() + 7);
    return formatUtcDate(nextDate);
  }

  if (frequency === "Monthly") {
    nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
    return formatUtcDate(nextDate);
  }

  nextDate.setUTCDate(nextDate.getUTCDate() + (customIntervalDays || 1));
  return formatUtcDate(nextDate);
};

const resolveCategoryId = async ({ userId, categoryName, categoryIcon, type }) => {
  const [existingCategories] = await db.promise().query(
    `
      SELECT category_id
      FROM categories
      WHERE user_id = ?
        AND (
          (? IS NOT NULL AND icon = ?)
          OR LOWER(TRIM(name)) = LOWER(TRIM(?))
        )
      LIMIT 1
    `,
    [userId, categoryIcon, categoryIcon, categoryName]
  );

  let categoryId = existingCategories[0]?.category_id;

  if (!categoryId) {
    const [insertCategoryResult] = await db.promise().query(
      `
        INSERT INTO categories (user_id, name, type, icon)
        VALUES (?, ?, ?, ?)
      `,
      [userId, categoryName, type, categoryIcon]
    );

    categoryId = insertCategoryResult.insertId;
  } else if (categoryIcon) {
    await db.promise().query(
      `
        UPDATE categories
        SET icon = COALESCE(icon, ?)
        WHERE category_id = ?
      `,
      [categoryIcon, categoryId]
    );
  }

  return categoryId;
};

const insertTransaction = async ({
  userId,
  categoryId,
  amount,
  type,
  description,
  transactionDate,
  recurringPaymentId = null
}) => {
  const [result] = await db.promise().query(
    `
      INSERT INTO transactions (
        user_id,
        category_id,
        amount,
        type,
        description,
        transaction_date,
        created_at,
        recurring_payment_id
      )
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
    `,
    [userId, categoryId, amount, type, description, transactionDate, recurringPaymentId]
  );

  return result.insertId;
};

const insertRecurringException = async (recurringPaymentId, occurrenceDate) => {
  if (!recurringPaymentId || !occurrenceDate) {
    return;
  }

  await db.promise().query(
    `
      INSERT IGNORE INTO recurring_payment_exceptions (recurring_payment_id, occurrence_date)
      VALUES (?, ?)
    `,
    [recurringPaymentId, occurrenceDate]
  );
};

const processRecurringPayments = async (userId) => {
  if (!userId) {
    return;
  }

  const todayDateValue = getTodayDateValue();
  const [recurringPayments] = await db.promise().query(
    `
      SELECT
        recurring_payment_id,
        user_id,
        category_id,
        amount,
        type,
        description,
        frequency,
        custom_interval_days,
        start_date,
        end_date,
        next_run_date,
        is_active
      FROM recurring_payments
      WHERE user_id = ? AND is_active = 1
      ORDER BY next_run_date ASC, recurring_payment_id ASC
    `,
    [userId]
  );

  for (const recurringPayment of recurringPayments) {
    const endDate = normalizeDateValue(recurringPayment.end_date);
    let nextRunDate =
      normalizeDateValue(recurringPayment.next_run_date) ||
      normalizeDateValue(recurringPayment.start_date);

    while (
      nextRunDate <= todayDateValue &&
      (!endDate || nextRunDate <= endDate)
    ) {
      const [existingExceptions] = await db.promise().query(
        `
          SELECT recurring_payment_exception_id
          FROM recurring_payment_exceptions
          WHERE recurring_payment_id = ? AND occurrence_date = ?
          LIMIT 1
        `,
        [recurringPayment.recurring_payment_id, nextRunDate]
      );

      if (existingExceptions.length === 0) {
        const [existingTransactions] = await db.promise().query(
          `
            SELECT transaction_id
            FROM transactions
            WHERE recurring_payment_id = ? AND transaction_date = ?
            LIMIT 1
          `,
          [recurringPayment.recurring_payment_id, nextRunDate]
        );

        if (existingTransactions.length === 0) {
          await insertTransaction({
            userId: recurringPayment.user_id,
            categoryId: recurringPayment.category_id,
            amount: recurringPayment.amount,
            type: recurringPayment.type,
            description: recurringPayment.description,
            transactionDate: nextRunDate,
            recurringPaymentId: recurringPayment.recurring_payment_id
          });
        }
      }

      nextRunDate = calculateNextOccurrenceDate(
        nextRunDate,
        recurringPayment.frequency,
        recurringPayment.custom_interval_days
      );
    }

    const isActive = !endDate || nextRunDate <= endDate ? 1 : 0;

    await db.promise().query(
      `
        UPDATE recurring_payments
        SET next_run_date = ?, is_active = ?
        WHERE recurring_payment_id = ?
      `,
      [nextRunDate, isActive, recurringPayment.recurring_payment_id]
    );
  }
};

exports.addTransaction = async (req, res) => {
  const {
    user_id,
    amount,
    type,
    description,
    note,
    transaction_date,
    category,
    categoryIcon,
    recurring,
    recurringFrequency,
    recurringStartDate,
    recurringEndDate,
    customIntervalDays
  } = req.body;

  const finalDescription = description || note || "No description";
  const finalTransactionDate =
    typeof transaction_date === "string" && transaction_date.trim()
      ? transaction_date
      : new Date().toISOString().slice(0, 10);
  const finalCategoryName = normalizeCategoryName(category);
  const finalCategoryIcon = normalizeCategoryIcon(categoryIcon);
  const isRecurring = Boolean(recurring);
  const startDate =
    typeof recurringStartDate === "string" && recurringStartDate.trim()
      ? recurringStartDate
      : finalTransactionDate;
  const endDate =
    typeof recurringEndDate === "string" && recurringEndDate.trim()
      ? recurringEndDate
      : null;
  const normalizedFrequency = typeof recurringFrequency === "string"
    ? recurringFrequency.trim()
    : "";
  const normalizedCustomIntervalDays = normalizeCustomIntervalDays(customIntervalDays);

  if (!user_id || !amount || !type || !finalCategoryName) {
    return res.status(400).json({ message: "user_id, amount, type, and category are required" });
  }

  if (isRecurring) {
    if (!ALLOWED_RECURRING_FREQUENCIES.has(normalizedFrequency)) {
      return res.status(400).json({ message: "Choose a valid recurring frequency." });
    }

    if (endDate && endDate < startDate) {
      return res.status(400).json({ message: "End date must be the same as or after the start date." });
    }

    if (normalizedFrequency === "Custom" && !normalizedCustomIntervalDays) {
      return res.status(400).json({ message: "Enter a custom repeat interval in days." });
    }
  }

  try {
    const categoryId = await resolveCategoryId({
      userId: user_id,
      categoryName: finalCategoryName,
      categoryIcon: finalCategoryIcon,
      type
    });

    if (isRecurring) {
      const [recurringResult] = await db.promise().query(
        `
          INSERT INTO recurring_payments (
            user_id,
            category_id,
            amount,
            type,
            description,
            frequency,
            custom_interval_days,
            start_date,
            end_date,
            next_run_date,
            is_active,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
        `,
        [
          user_id,
          categoryId,
          amount,
          type,
          finalDescription,
          normalizedFrequency,
          normalizedFrequency === "Custom" ? normalizedCustomIntervalDays : null,
          startDate,
          endDate,
          startDate
        ]
      );

      const recurringPaymentId = recurringResult.insertId;
      const transactionId = await insertTransaction({
        userId: user_id,
        categoryId,
        amount,
        type,
        description: finalDescription,
        transactionDate: startDate,
        recurringPaymentId
      });
      const nextRunDate = calculateNextOccurrenceDate(
        startDate,
        normalizedFrequency,
        normalizedCustomIntervalDays
      );
      const isActive = !endDate || nextRunDate <= endDate ? 1 : 0;

      await db.promise().query(
        `
          UPDATE recurring_payments
          SET next_run_date = ?, is_active = ?
          WHERE recurring_payment_id = ?
        `,
        [nextRunDate, isActive, recurringPaymentId]
      );

      return res.json({
        message: "Recurring transaction added successfully",
        transaction_id: transactionId,
        recurring_payment_id: recurringPaymentId,
        category_id: categoryId,
        created_at: new Date().toISOString()
      });
    }

    const transactionId = await insertTransaction({
      userId: user_id,
      categoryId,
      amount,
      type,
      description: finalDescription,
      transactionDate: finalTransactionDate
    });

    return res.json({
      message: "Transaction added successfully",
      transaction_id: transactionId,
      category_id: categoryId,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("TRANSACTION ERROR:", err);
    return res.status(500).json({ message: "Insert failed" });
  }
};

exports.updateTransaction = async (req, res) => {
  const { transactionId } = req.params;
  const { user_id, amount, type, description, note, transaction_date, category, categoryIcon } = req.body;

  const finalDescription = description || note || "No description";
  const finalTransactionDate =
    typeof transaction_date === "string" && transaction_date.trim()
      ? transaction_date
      : new Date().toISOString().slice(0, 10);
  const finalCategoryName = normalizeCategoryName(category);
  const finalCategoryIcon = normalizeCategoryIcon(categoryIcon);

  if (!user_id || !amount || !type || !finalCategoryName) {
    return res.status(400).json({ message: "user_id, amount, type, and category are required" });
  }

  try {
    const [existingTransactions] = await db.promise().query(
      `
        SELECT transaction_id, recurring_payment_id, transaction_date
        FROM transactions
        WHERE transaction_id = ? AND user_id = ?
        LIMIT 1
      `,
      [transactionId, user_id]
    );

    if (existingTransactions.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const existingTransaction = existingTransactions[0];
    const existingTransactionDate = normalizeDateValue(existingTransaction.transaction_date);
    const categoryId = await resolveCategoryId({
      userId: user_id,
      categoryName: finalCategoryName,
      categoryIcon: finalCategoryIcon,
      type
    });

    if (
      existingTransaction.recurring_payment_id &&
      existingTransactionDate &&
      existingTransactionDate !== finalTransactionDate
    ) {
      await insertRecurringException(
        existingTransaction.recurring_payment_id,
        existingTransactionDate
      );
    }

    await db.promise().query(
      `
        UPDATE transactions
        SET category_id = ?, amount = ?, type = ?, description = ?, transaction_date = ?
        WHERE transaction_id = ? AND user_id = ?
      `,
      [categoryId, amount, type, finalDescription, finalTransactionDate, transactionId, user_id]
    );

    return res.json({
      message: "Transaction updated successfully",
      category_id: categoryId
    });
  } catch (err) {
    console.error("TRANSACTION UPDATE ERROR:", err);
    return res.status(500).json({ message: "Update failed" });
  }
};

exports.deleteTransaction = async (req, res) => {
  const { transactionId } = req.params;
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: "user_id is required" });
  }

  try {
    const [existingTransactions] = await db.promise().query(
      `
        SELECT transaction_id, recurring_payment_id, transaction_date
        FROM transactions
        WHERE transaction_id = ? AND user_id = ?
        LIMIT 1
      `,
      [transactionId, user_id]
    );

    if (existingTransactions.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const existingTransaction = existingTransactions[0];
    const existingTransactionDate = normalizeDateValue(existingTransaction.transaction_date);

    if (existingTransaction.recurring_payment_id && existingTransactionDate) {
      await insertRecurringException(
        existingTransaction.recurring_payment_id,
        existingTransactionDate
      );
    }

    await db.promise().query(
      `
        DELETE FROM transactions
        WHERE transaction_id = ? AND user_id = ?
      `,
      [transactionId, user_id]
    );

    return res.json({ message: "Transaction deleted successfully" });
  } catch (err) {
    console.error("TRANSACTION DELETE ERROR:", err);
    return res.status(500).json({ message: "Delete failed" });
  }
};

exports.getTransactions = async (req, res) => {
  const { user_id } = req.query;

  try {
    await processRecurringPayments(user_id);

    const [results] = await db.promise().query(
      `
        SELECT
          t.*,
          c.name AS category_name,
          c.icon AS category_icon
        FROM transactions t
        LEFT JOIN categories c
          ON c.category_id = t.category_id
        WHERE t.user_id = ?
        ORDER BY t.transaction_date DESC, t.transaction_id DESC
      `,
      [user_id]
    );

    return res.json(results);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "DB error" });
  }
};
