const padNumber = (value) => String(value).padStart(2, "0");

export const formatAsDateValue = (date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

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
  if (!value) {
    return "";
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
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
    start_date: budget?.start_date || defaultRange.startDate,
    end_date: budget?.end_date || defaultRange.endDate
  };
};
