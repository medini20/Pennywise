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
  if (await hasColumn("budgets", "is_system_generated")) {
    return;
  }

  await db.promise().query(
    `
      ALTER TABLE budgets
      ADD COLUMN is_system_generated TINYINT(1) NOT NULL DEFAULT 0
    `
  );

  console.log("Added missing budgets.is_system_generated column");
};

const ensureUsersSchema = async () => {
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
  if (await hasColumn("transactions", "created_at")) {
    return;
  }

  await db.promise().query(
    `
      ALTER TABLE transactions
      ADD COLUMN created_at DATETIME NULL
    `
  );

  console.log("Added missing transactions.created_at column");
};

const ensureRuntimeSchema = async () => {
  try {
    await ensureBudgetSchema();
    await ensureUsersSchema();
    await ensureOtpSchema();
    await ensureCategorySchema();
    await ensureTransactionSchema();
  } catch (error) {
    console.error("Runtime schema check failed:", error.message);
    throw error;
  }
};

module.exports = {
  ensureRuntimeSchema
};
