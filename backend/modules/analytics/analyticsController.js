const analyticsModel = require("./analyticsModel");

const getAnalyticsSummary = async (req, res) => {
  const { month, year, userId, period } = req.query;

  if (!year) {
    return res.status(400).json({ error: "Year is a required parameter." });
  }

  const normalizedPeriod = period === "yearly" ? "yearly" : "monthly";

  if (normalizedPeriod === "monthly" && !month) {
    return res.status(400).json({ error: "Month is required for monthly analytics." });
  }

  const id = Number(req.user?.user_id || req.user?.id || userId);
  const normalizedYear = Number(year);
  const normalizedMonth = Number(month);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(401).json({ error: "Valid userId is required." });
  }

  if (!Number.isInteger(normalizedYear) || normalizedYear < 2000 || normalizedYear > 3000) {
    return res.status(400).json({ error: "Year must be a valid number." });
  }

  if (
    normalizedPeriod === "monthly" &&
    (!Number.isInteger(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12)
  ) {
    return res.status(400).json({ error: "Month must be between 1 and 12." });
  }

  try {
    const data = await analyticsModel.getFilteredTransactions(
      id,
      normalizedPeriod === "monthly" ? normalizedMonth : null,
      normalizedYear
    );

    return res.status(200).json(data);
  } catch (err) {
    console.error("analytics summary error:", err.message);
    return res.status(500).json({ error: "Unable to load analytics right now." });
  }
};

module.exports = {
  getAnalyticsSummary
};
