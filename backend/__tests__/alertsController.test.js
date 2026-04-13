const mockDbQuery = jest.fn();

jest.mock("../config/db", () => ({
  query: (...args) => mockDbQuery(...args),
  promise: () => ({
    query: jest.fn()
  })
}));

jest.mock("../utils/emailService", () => ({
  sendBudgetAlert: jest.fn()
}));

const alertsController = require("../modules/alerts/alertsController");

const createResponse = () => {
  const response = {};

  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);

  return response;
};

const getCurrentMonthDateRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);

  return {
    month,
    startDate,
    endDate: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(
      endDate.getDate()
    ).padStart(2, "0")}`
  };
};

describe("alertsController.createAlert", () => {
  beforeEach(() => {
    const currentRange = getCurrentMonthDateRange();
    const monthlyBudget = {
      budget_id: 7,
      user_id: 1,
      name: "Monthly Budget",
      icon: null,
      amount: 5000,
      color: "#ffcc00",
      start_date: currentRange.startDate,
      end_date: currentRange.endDate,
      month: currentRange.month,
      is_system_generated: 1
    };

    mockDbQuery.mockReset();
    mockDbQuery.mockImplementation((sql, params, callback) => {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();

      if (normalizedSql.includes("FROM information_schema.COLUMNS")) {
        callback(null, []);
        return;
      }

      if (normalizedSql.startsWith("DELETE ")) {
        callback(null, { affectedRows: 0 });
        return;
      }

      if (
        normalizedSql.includes("FROM budgets") &&
        normalizedSql.includes("ORDER BY budget_id DESC")
      ) {
        callback(null, [monthlyBudget]);
        return;
      }

      if (
        normalizedSql.includes("FROM budgets") &&
        normalizedSql.includes("ORDER BY COALESCE(is_system_generated, 0) DESC")
      ) {
        callback(null, [monthlyBudget]);
        return;
      }

      if (
        normalizedSql.includes("FROM budgets") &&
        normalizedSql.includes("WHERE budget_id = ? AND user_id = ?")
      ) {
        callback(null, [monthlyBudget]);
        return;
      }

      if (
        normalizedSql.includes("FROM alerts a") &&
        normalizedSql.includes("WHERE a.user_id = ?") &&
        normalizedSql.includes("AND a.budget_id = ?") &&
        normalizedSql.includes("AND a.threshold_percent = ?")
      ) {
        callback(null, []);
        return;
      }

      if (normalizedSql.startsWith("INSERT INTO alerts")) {
        const duplicateError = new Error("Duplicate entry");
        duplicateError.code = "ER_DUP_ENTRY";
        duplicateError.errno = 1062;
        callback(duplicateError);
        return;
      }

      callback(new Error(`Unexpected SQL in test: ${normalizedSql}`));
    });
  });

  it("returns the duplicate-alert conflict when the insert loses a race", async () => {
    const response = createResponse();

    await alertsController.createAlert(
      {
        body: {
          user_id: 1,
          scope: "overall",
          threshold_percent: 80
        },
        query: {}
      },
      response
    );

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      error: "Your monthly budget already has an alert for that percentage.",
      scope: "overall",
      budget_name: "Monthly Budget"
    });
  });
});
