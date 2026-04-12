jest.mock("../../config/db", () => ({
  promise: () => ({
    query: jest.fn(),
  }),
}));

const controller = require("./transactionController");

describe("transactionController recurring date safety", () => {
  const {
    calculateNextOccurrenceDate,
    getValidatedNextOccurrenceDate,
  } = controller.__test__;

  test("advances weekly recurring dates", () => {
    expect(calculateNextOccurrenceDate("2026-04-12", "Weekly")).toBe("2026-04-19");
    expect(getValidatedNextOccurrenceDate("2026-04-12", "Weekly")).toBe("2026-04-19");
  });

  test("advances monthly recurring dates", () => {
    expect(calculateNextOccurrenceDate("2026-04-12", "Monthly")).toBe("2026-05-12");
    expect(getValidatedNextOccurrenceDate("2026-04-12", "Monthly")).toBe("2026-05-12");
  });

  test("advances custom recurring dates", () => {
    expect(calculateNextOccurrenceDate("2026-04-12", "Custom", 3)).toBe("2026-04-15");
    expect(getValidatedNextOccurrenceDate("2026-04-12", "Custom", 3)).toBe("2026-04-15");
  });

  test("rejects non-advancing recurring dates", () => {
    const stagnantCalculator = jest.fn(() => "2026-04-12");

    expect(
      getValidatedNextOccurrenceDate(
        "2026-04-12",
        "Weekly",
        null,
        stagnantCalculator
      )
    ).toBeNull();
  });
});
