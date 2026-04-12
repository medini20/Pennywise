const padNumber = (value) => String(value).padStart(2, "0");
const isValidDateParts = (year, month, day) => {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
};

const normalizeStrictDate = (value) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  return isValidDateParts(year, month, day)
    ? `${year}-${padNumber(month)}-${padNumber(day)}`
    : null;
};

export const formatAsDateValue = (date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

export const parseBudgetDateValue = (value) => {
  const normalizedValue = normalizeBudgetDateValue(value);

  if (!normalizedValue) {
    return null;
  }

  const [year, month, day] = normalizedValue.split("-").map(Number);

  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return new Date(year, month - 1, day);
};

export const normalizeBudgetDateValue = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
      return normalizeStrictDate(trimmedValue);
    }

    const datePrefixMatch = trimmedValue.match(/^(\d{4}-\d{2}-\d{2})T/);

    if (datePrefixMatch) {
      return normalizeStrictDate(datePrefixMatch[1]);
    }

    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatAsDateValue(value);
  }

  return null;
};

export const getCurrentMonthDateRange = () => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: formatAsDateValue(startDate),
    endDate: formatAsDateValue(endDate)
  };
};

export const formatDisplayDate = (value, options = {}) => {
  const normalizedValue = normalizeBudgetDateValue(value);

  if (normalizedValue === null) {
    return "Invalid date";
  }

  if (!normalizedValue) {
    return "";
  }

  const parsedDate = parseBudgetDateValue(normalizedValue);

  if (!parsedDate) {
    return normalizedValue;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options
  });
};

export const formatDateRange = (startDate, endDate, options = {}) => {
  if (!startDate && !endDate) {
    return "No period selected";
  }

  if (startDate && endDate) {
    return `${formatDisplayDate(startDate, options)} - ${formatDisplayDate(endDate, options)}`;
  }

  return formatDisplayDate(startDate || endDate, options);
};

export const withDefaultBudgetDateRange = (budget) => {
  const defaultRange = getCurrentMonthDateRange();

  return {
    ...budget,
    start_date: normalizeBudgetDateValue(budget?.start_date) || defaultRange.startDate,
    end_date: normalizeBudgetDateValue(budget?.end_date) || defaultRange.endDate
  };
};
