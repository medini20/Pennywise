const padNumber = (value) => String(value).padStart(2, "0");

export const formatAsDateValue = (date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

export const normalizeBudgetDateValue = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
      return trimmedValue;
    }

    const datePrefixMatch = trimmedValue.match(/^(\d{4}-\d{2}-\d{2})T/);

    if (datePrefixMatch) {
      return datePrefixMatch[1];
    }

    const parsedDate = new Date(trimmedValue);

    if (!Number.isNaN(parsedDate.getTime())) {
      return formatAsDateValue(parsedDate);
    }

    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatAsDateValue(value);
  }

  return "";
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

  if (!normalizedValue) {
    return "";
  }

  const parsedDate = new Date(`${normalizedValue}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
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
