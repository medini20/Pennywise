const db = require("./db");

const ensureBudgetSchema = async () => {
  const databaseName = process.env.DB_NAME || "expense_tracker";

  const [existingColumns] = await db.promise().query(
    `
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'budgets'
        AND COLUMN_NAME = 'is_system_generated'
      LIMIT 1
    `,
    [databaseName]
  );

  if (existingColumns.length > 0) {
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

const ensureRuntimeSchema = async () => {
  try {
    await ensureBudgetSchema();
  } catch (error) {
    console.error("Runtime schema check failed:", error.message);
    throw error;
  }
};

module.exports = {
  ensureRuntimeSchema
};
