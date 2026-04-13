const mockDbQuery = jest.fn();
const mockPromiseQuery = jest.fn();

jest.mock("../config/db", () => ({
  query: (...args) => mockDbQuery(...args),
  promise: () => ({
    query: (...args) => mockPromiseQuery(...args)
  })
}));

const budgetRoutes = require("../modules/budget/budgetRoutes");
const budgetController = require("../modules/budget/budgetController");

const createResponse = () => {
  const response = {};

  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);

  return response;
};

describe("budget route protection", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
    mockPromiseQuery.mockReset();
  });

  it("rejects unauthenticated budget list requests before the controller runs", async () => {
    const response = createResponse();

    budgetRoutes.handle(
      {
        method: "GET",
        url: "/list",
        headers: {}
      },
      response,
      jest.fn()
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ message: "Authorization token is required" });
    expect(mockDbQuery).not.toHaveBeenCalled();
  });
});

describe("budgetController.getBudgets", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
    mockPromiseQuery.mockReset();
    mockPromiseQuery.mockImplementation(async (sql) => {
      if (typeof sql === "string" && sql.includes("information_schema.COLUMNS")) {
        return [[]];
      }

      throw new Error(`Unexpected promise query in test: ${sql}`);
    });
  });

  it("uses the authenticated user id instead of a spoofed query user_id", async () => {
    mockDbQuery.mockImplementation((sql, params, callback) => {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();

      if (normalizedSql.startsWith("DELETE a")) {
        callback(null, { affectedRows: 0 });
        return;
      }

      if (normalizedSql.startsWith("DELETE FROM budgets")) {
        callback(null, { affectedRows: 0 });
        return;
      }

      if (
        normalizedSql.includes("FROM budgets") &&
        normalizedSql.includes("ORDER BY budget_id DESC LIMIT 1")
      ) {
        callback(null, []);
        return;
      }

      if (
        normalizedSql.includes("FROM budgets b") &&
        normalizedSql.includes("WHERE b.user_id = ?") &&
        normalizedSql.includes("ORDER BY b.budget_id DESC")
      ) {
        callback(null, []);
        return;
      }

      callback(new Error(`Unexpected SQL in test: ${normalizedSql}`));
    });

    const response = createResponse();

    await budgetController.getBudgets(
      {
        user: { id: 7, user_id: 7 },
        query: { user_id: "999" },
        body: {}
      },
      response
    );

    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining("FROM budgets b"),
      [7, "Monthly Budget"],
      expect.any(Function)
    );
    expect(
      mockDbQuery.mock.calls.find(([, params]) => Array.isArray(params) && params[0] === 999)
    ).toBeUndefined();
    expect(response.json).toHaveBeenCalledWith([]);
  });
});
