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

const ensureBudgetSchema = async () => {
  if (!(await hasTable("budgets"))) {
    console.log("Skipping budgets schema update: budgets table not found");
    return;
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

  if (await hasColumn("categories", "icon")) {
    return;
  }

  await db.promise().query(
    `
      ALTER TABLE categories
      ADD COLUMN icon VARCHAR(50) NULL
    `
  );

  console.log("Added missing categories.icon column");
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

  if (!(await hasColumn("transactions", "recurring_payment_id"))) {
    await db.promise().query(
      `
        ALTER TABLE transactions
        ADD COLUMN recurring_payment_id INT NULL
      `
    );

    console.log("Added missing transactions.recurring_payment_id column");
  }
};

const ensureRecurringPaymentsSchema = async () => {
  if (await hasTable("recurring_payments")) {
    return;
  }

  await db.promise().query(
    `
      CREATE TABLE recurring_payments (
        recurring_payment_id INT(11) NOT NULL AUTO_INCREMENT,
        user_id INT(11) NOT NULL,
        category_id INT(11) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        type VARCHAR(20) NOT NULL,
        description VARCHAR(255) NOT NULL,
        frequency VARCHAR(20) NOT NULL,
        custom_interval_days INT(11) NULL,
        start_date DATE NOT NULL,
        end_date DATE NULL,
        next_run_date DATE NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (recurring_payment_id),
        KEY user_id (user_id),
        KEY category_id (category_id),
        KEY next_run_date (next_run_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  );

  console.log("Created missing recurring_payments table");
};

const ensureRecurringExceptionsSchema = async () => {
  if (await hasTable("recurring_payment_exceptions")) {
    return;
  }

  await db.promise().query(
    `
      CREATE TABLE recurring_payment_exceptions (
        recurring_payment_exception_id INT(11) NOT NULL AUTO_INCREMENT,
        recurring_payment_id INT(11) NOT NULL,
        occurrence_date DATE NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (recurring_payment_exception_id),
        UNIQUE KEY recurring_payment_occurrence (recurring_payment_id, occurrence_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  );

  console.log("Created missing recurring_payment_exceptions table");
};

const ensureRuntimeSchema = async () => {
  try {
    await ensureBudgetSchema();
    await ensureUsersSchema();
    await ensureOtpSchema();
    await ensureCategorySchema();
    await ensureTransactionSchema();
    await ensureRecurringPaymentsSchema();
    await ensureRecurringExceptionsSchema();
  } catch (error) {
    console.error("Runtime schema check failed:", error.message);
    throw error;
  }
};

module.exports = {
  ensureRuntimeSchema
};
