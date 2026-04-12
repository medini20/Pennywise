import {
  formatDisplayDate,
  normalizeBudgetDateValue,
  parseBudgetDateValue,
} from "./budgetDates";

describe("budget date utilities", () => {
  test("keeps strict YYYY-MM-DD values stable without timezone parsing", () => {
    expect(normalizeBudgetDateValue("2026-04-05")).toBe("2026-04-05");

    const parsedDate = parseBudgetDateValue("2026-04-05");
    expect(parsedDate).not.toBeNull();
    expect(parsedDate.getFullYear()).toBe(2026);
    expect(parsedDate.getMonth()).toBe(3);
    expect(parsedDate.getDate()).toBe(5);
  });

  test("accepts ISO datetime values by using only the date portion", () => {
    expect(normalizeBudgetDateValue("2026-04-05T23:59:59.000Z")).toBe("2026-04-05");
  });

  test("returns null for invalid provided date strings instead of masking them", () => {
    expect(normalizeBudgetDateValue("2026-02-31")).toBeNull();
    expect(normalizeBudgetDateValue("not-a-date")).toBeNull();
    expect(formatDisplayDate("2026-02-31")).toBe("Invalid date");
  });

  test("returns an empty string only when no date is provided", () => {
    expect(normalizeBudgetDateValue("")).toBe("");
    expect(normalizeBudgetDateValue(null)).toBe("");
    expect(normalizeBudgetDateValue(undefined)).toBe("");
  });
});
