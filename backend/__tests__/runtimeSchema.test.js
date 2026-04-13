const mockPromiseQuery = jest.fn();

jest.mock("../config/db", () => ({
  promise: () => ({
    query: (...args) => mockPromiseQuery(...args)
  })
}));

const { ensureAlertsSchema } = require("../config/runtimeSchema");

describe("ensureAlertsSchema", () => {
  beforeEach(() => {
    mockPromiseQuery.mockReset();
  });

  it("deduplicates alerts before adding the unique alert constraint", async () => {
    mockPromiseQuery.mockImplementation((sql) => {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();

      if (normalizedSql.includes("FROM information_schema.TABLES")) {
        return Promise.resolve([[{ TABLE_NAME: "alerts" }]]);
      }

      if (normalizedSql.includes("FROM information_schema.STATISTICS")) {
        return Promise.resolve([[]]);
      }

      if (normalizedSql.startsWith("DELETE duplicate_alert")) {
        return Promise.resolve([{ affectedRows: 2 }]);
      }

      if (
        normalizedSql.includes(
          "ALTER TABLE alerts ADD UNIQUE KEY uniq_alert_user_budget_threshold (user_id, budget_id, threshold_percent)"
        )
      ) {
        return Promise.resolve([{ affectedRows: 0 }]);
      }

      return Promise.reject(new Error(`Unexpected SQL in test: ${normalizedSql}`));
    });

    await ensureAlertsSchema();

    const executedStatements = mockPromiseQuery.mock.calls.map(([sql]) =>
      sql.replace(/\s+/g, " ").trim()
    );

    expect(
      executedStatements.some((statement) => statement.startsWith("DELETE duplicate_alert"))
    ).toBe(true);
    expect(
      executedStatements.some((statement) =>
        statement.includes(
          "ALTER TABLE alerts ADD UNIQUE KEY uniq_alert_user_budget_threshold (user_id, budget_id, threshold_percent)"
        )
      )
    ).toBe(true);
  });
});
