const db = require("./db");

const getDatabaseName = () => process.env.DB_NAME || "expense_tracker";

const hasColumn = async (tableName, columnName) => {
  const [rows] = await db.promise().query(
    `
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [getDatabaseName(), tableName, columnName]
  );

  return rows.length > 0;
};

const hasTable = async (tableName) => {
  const [rows] = await db.promise().query(
    `
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
      LIMIT 1
    `,
    [getDatabaseName(), tableName]
  );

  return rows.length > 0;
};

const hasIndex = async (tableName, indexName) => {
  const [rows] = await db.promise().query(
    `
      SELECT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [getDatabaseName(), tableName, indexName]
  );

  return rows.length > 0;
};

const ensureBudgetSchema = async () => {
  if (!(await hasTable("budgets"))) {
    console.log("Skipping budgets schema update: budgets table not found");
    return;
  }

  if (!(await hasColumn("budgets", "name"))) {
    await db.promise().query(
      `
        ALTER TABLE budgets
        ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'Monthly Budget'
      `
    );

    if (await hasColumn("budgets", "category_id")) {
      await db.promise().query(
        `
          UPDATE budgets b
          LEFT JOIN categories c ON c.category_id = b.category_id
          SET b.name = COALESCE(NULLIF(TRIM(b.name), ''), c.name, 'Monthly Budget')
        `
      );
    }

    console.log("Added missing budgets.name column");
  }

  if (!(await hasColumn("budgets", "icon"))) {
    await db.promise().query(
      `
        ALTER TABLE budgets
        ADD COLUMN icon VARCHAR(50) NULL
      `
    );

    if (await hasColumn("budgets", "category_id")) {
      await db.promise().query(
        `
          UPDATE budgets b
          LEFT JOIN categories c ON c.category_id = b.category_id
          SET b.icon = COALESCE(NULLIF(TRIM(b.icon), ''), c.icon)
          WHERE b.icon IS NULL OR TRIM(b.icon) = ''
        `
      );
    }

    console.log("Added missing budgets.icon column");
  }

  if (!(await hasColumn("budgets", "spent"))) {
    await db.promise().query(
      `
        ALTER TABLE budgets
        ADD COLUMN spent DECIMAL(10,2) NOT NULL DEFAULT 0
      `
    );

    console.log("Added missing budgets.spent column");
  }

  if (!(await hasColumn("budgets", "color"))) {
    await db.promise().query(
      `
        ALTER TABLE budgets
        ADD COLUMN color VARCHAR(7) NOT NULL DEFAULT '#ffcc00'
      `
    );

    console.log("Added missing budgets.color column");
  }

  if (!(await hasColumn("budgets", "is_system_generated"))) {
    await db.promise().query(
      `
        ALTER TABLE budgets
        ADD COLUMN is_system_generated TINYINT(1) NOT NULL DEFAULT 0
      `
    );

    console.log("Added missing budgets.is_system_generated column");
  }

  if (!(await hasColumn("budgets", "start_date"))) {
    await db.promise().query(
      `
        ALTER TABLE budgets
        ADD COLUMN start_date DATE NULL
      `
    );

    console.log("Added missing budgets.start_date column");
  }

  if (!(await hasColumn("budgets", "end_date"))) {
    await db.promise().query(
      `
        ALTER TABLE budgets
        ADD COLUMN end_date DATE NULL
      `
    );

    console.log("Added missing budgets.end_date column");
  }
};

const ensureUsersSchema = async () => {
  if (!(await hasTable("users"))) {
    console.log("Skipping users schema update: users table not found");
    return;
  }

  if (await hasColumn("users", "is_verified")) {
    return;
  }

  await db.promise().query(
    `
      ALTER TABLE users
      ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 1
    `
  );

  console.log("Added missing users.is_verified column");
};

const ensureOtpSchema = async () => {
  if (await hasTable("otps")) {
    return;
  }

  await db.promise().query(
    `
      CREATE TABLE otps (
        otp_id INT(11) NOT NULL AUTO_INCREMENT,
        email VARCHAR(100) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        purpose VARCHAR(50) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (otp_id),
        KEY email (email),
        KEY purpose (purpose)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  );

  console.log("Created missing otps table");
};

const ensureCategorySchema = async () => {
  if (!(await hasTable("categories"))) {
    console.log("Skipping categories schema update: categories table not found");
    return;
  }

  if (!(await hasColumn("categories", "icon"))) {
    await db.promise().query(
      `
        ALTER TABLE categories
        ADD COLUMN icon VARCHAR(50) NULL
      `
    );

    console.log("Added missing categories.icon column");
  }

  await db.promise().query(
    `
      UPDATE categories
      SET name = TRIM(name),
          type = TRIM(type)
      WHERE name <> TRIM(name) OR type <> TRIM(type)
    `
  );

  const [duplicateGroups] = await db.promise().query(
    `
      SELECT
        user_id,
        LOWER(TRIM(name)) AS normalized_name,
        LOWER(TRIM(type)) AS normalized_type,
        MIN(category_id) AS keep_category_id,
        GROUP_CONCAT(category_id ORDER BY category_id ASC) AS category_ids,
        COUNT(*) AS duplicate_count
      FROM categories
      GROUP BY user_id, LOWER(TRIM(name)), LOWER(TRIM(type))
      HAVING COUNT(*) > 1
    `
  );

  for (const duplicateGroup of duplicateGroups) {
    const keepCategoryId = Number(duplicateGroup.keep_category_id);
    const duplicateCategoryIds = String(duplicateGroup.category_ids || "")
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0 && value !== keepCategoryId);

    if (duplicateCategoryIds.length === 0) {
      continue;
    }

    const placeholders = duplicateCategoryIds.map(() => "?").join(", ");
    const params = [keepCategoryId, ...duplicateCategoryIds];

    if (await hasColumn("transactions", "category_id")) {
      await db.promise().query(
        `
          UPDATE transactions
          SET category_id = ?
          WHERE category_id IN (${placeholders})
        `,
        params
      );
    }

    if (await hasTable("recurring_payments") && (await hasColumn("recurring_payments", "category_id"))) {
      await db.promise().query(
        `
          UPDATE recurring_payments
          SET category_id = ?
          WHERE category_id IN (${placeholders})
        `,
        params
      );
    }

    if (await hasColumn("budgets", "category_id")) {
      await db.promise().query(
        `
          UPDATE budgets
          SET category_id = ?
          WHERE category_id IN (${placeholders})
        `,
        params
      );
    }

    await db.promise().query(
      `
        DELETE FROM categories
        WHERE category_id IN (${placeholders})
      `,
      duplicateCategoryIds
    );
  }

  if (!(await hasIndex("categories", "uniq_categories_user_type_name"))) {
    await db.promise().query(
      `
        ALTER TABLE categories
        ADD UNIQUE KEY uniq_categories_user_type_name (user_id, type, name)
      `
    );

    console.log("Added categories unique index for user_id, type, and name");
  }
};

const ensureTransactionSchema = async () => {
  if (!(await hasTable("transactions"))) {
    console.log("Skipping transactions schema update: transactions table not found");
    return;
  }

  if (!(await hasColumn("transactions", "created_at"))) {
    await db.promise().query(
      `
        ALTER TABLE transactions
        ADD COLUMN created_at DATETIME NULL
      `
    );

    console.log("Added missing transactions.created_at column");
  }

  if (!(await hasColumn("transactions", "category_icon"))) {
    await db.promise().query(
      `
        ALTER TABLE transactions
        ADD COLUMN category_icon VARCHAR(50) NULL
      `
    );

    await db.promise().query(
      `
        UPDATE transactions t
        LEFT JOIN categories c ON c.category_id = t.category_id
        SET t.category_icon = COALESCE(c.icon, t.category_icon)
        WHERE t.category_icon IS NULL OR TRIM(t.category_icon) = ''
      `
    );

    console.log("Added missing transactions.category_icon column");
  }
};

const ensureRecurringSchema = async () => {
  if (!(await hasTable("transactions"))) {
    console.log("Skipping recurring schema update: transactions table not found");
    return;
  }

  if (!(await hasColumn("transactions", "recurring_payment_id"))) {
    await db.promise().query(
      `
        ALTER TABLE transactions
        ADD COLUMN recurring_payment_id INT(11) NULL
      `
    );

    console.log("Added missing transactions.recurring_payment_id column");
  }

  if (!(await hasTable("recurring_payments"))) {
    await db.promise().query(
      `
        CREATE TABLE recurring_payments (
          recurring_payment_id INT(11) NOT NULL AUTO_INCREMENT,
          user_id INT(11) NOT NULL,
          category_id INT(11) NOT NULL,
          category_icon VARCHAR(50) NULL,
          amount DECIMAL(10,2) NOT NULL,
          type ENUM('income','expense') NOT NULL,
          description VARCHAR(255) NULL,
          frequency VARCHAR(20) NOT NULL,
          custom_interval_days INT(11) NULL,
          start_date DATE NOT NULL,
          end_date DATE NULL,
          next_run_date DATE NOT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (recurring_payment_id),
          KEY idx_recurring_user (user_id),
          KEY idx_recurring_next_run (next_run_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `
    );

    console.log("Created missing recurring_payments table");
  }

  if (!(await hasColumn("recurring_payments", "category_icon"))) {
    await db.promise().query(
      `
        ALTER TABLE recurring_payments
        ADD COLUMN category_icon VARCHAR(50) NULL
      `
    );

    await db.promise().query(
      `
        UPDATE recurring_payments rp
        LEFT JOIN categories c ON c.category_id = rp.category_id
        SET rp.category_icon = COALESCE(c.icon, rp.category_icon)
        WHERE rp.category_icon IS NULL OR TRIM(rp.category_icon) = ''
      `
    );

    console.log("Added missing recurring_payments.category_icon column");
  }

  if (!(await hasTable("recurring_payment_exceptions"))) {
    await db.promise().query(
      `
        CREATE TABLE recurring_payment_exceptions (
          recurring_payment_exception_id INT(11) NOT NULL AUTO_INCREMENT,
          recurring_payment_id INT(11) NOT NULL,
          occurrence_date DATE NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (recurring_payment_exception_id),
          UNIQUE KEY uniq_recurring_occurrence (recurring_payment_id, occurrence_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `
    );

    console.log("Created missing recurring_payment_exceptions table");
  }
};

const ensureAlertsSchema = async () => {
  if (!(await hasTable("alerts"))) {
    console.log("Skipping alerts schema update: alerts table not found");
    return;
  }

  if (!(await hasIndex("alerts", "uniq_alerts_user_budget_threshold"))) {
    await db.promise().query(
      `
        ALTER TABLE alerts
        ADD UNIQUE KEY uniq_alerts_user_budget_threshold (user_id, budget_id, threshold_percent)
      `
    );

    console.log("Added alerts unique index for user_id, budget_id, and threshold_percent");
  }
};

const ensureRuntimeSchema = async () => {
  try {
    await ensureBudgetSchema();
    await ensureUsersSchema();
    await ensureOtpSchema();
    await ensureCategorySchema();
    await ensureAlertsSchema();
    await ensureTransactionSchema();
    await ensureRecurringSchema();
  } catch (error) {
    console.error("Runtime schema check failed:", error.message);
    throw error;
  }
};

module.exports = {
  ensureRuntimeSchema
};
