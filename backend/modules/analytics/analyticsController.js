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

  const id = userId || 1;

  try {
    const data = await analyticsModel.getFilteredTransactions(
      id,
      normalizedPeriod === "monthly" ? month : null,
      year
    );

    return res.status(200).json(data);
  } catch (err) {
    console.error("DETAILED ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAnalyticsSummary
};
