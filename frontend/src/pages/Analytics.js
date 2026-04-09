import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { getStoredUser } from "../services/authStorage";
import "./Analytics.css";
import { API_BASE_URL } from "../config/api";
const INR = "\u20B9";

const categoryColors = {
  "Food & Dining": "#22d3ee",
  Food: "#22d3ee",
  Transportation: "#8b5cf6",
  Shopping: "#facc15",
  Entertainment: "#a855f7",
  Utilities: "#ef4444",
  Health: "#ef4444",
  Education: "#10b981",
  Freelance: "#f59e0b",
  Other: "#3b82f6"
};

const fallbackCategoryPalette = [
  "#4c92ff",
  "#22d3ee",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#ec4899",
  "#facc15",
  "#14b8a6",
  "#60a5fa"
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatAmount = (value) => `${INR}${Number(value || 0).toLocaleString("en-IN")}`;

const getCategoryColor = (name, index) => {
  if (categoryColors[name]) {
    return categoryColors[name];
  }

  return fallbackCategoryPalette[index % fallbackCategoryPalette.length];
};

const getAnalyticsCategoryName = (transaction) => {
  const categoryName = transaction.category || "Other";
  const categoryType = transaction.category_type || transaction.categoryType;

  if (
    transaction.type === "expense" &&
    categoryType &&
    categoryType !== transaction.type
  ) {
    return transaction.description || categoryName;
  }

  return categoryName;
};

function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [chartType, setChartType] = useState("graph");
  const [period, setPeriod] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const storedUser = getStoredUser();
  const userId = storedUser?.id ?? storedUser?.user_id ?? null;

  const escapeCsvCell = (value) => {
    const normalizedValue =
      value === null || value === undefined ? "" : String(value);
    return `"${normalizedValue.replace(/"/g, "\"\"")}"`;
  };

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!userId) {
      setTransactions([]);
      setError("Please log in again to load analytics.");
      setLoading(false);
      return;
    }

    try {
      const searchParams = new URLSearchParams({
        userId: String(userId),
        year: String(selectedYear),
        period
      });

      if (period === "monthly") {
        searchParams.set("month", String(selectedMonth));
      }

      const response = await fetch(`${API_BASE_URL}/api/analytics/summary?${searchParams.toString()}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to load analytics.");
      }

      if (!Array.isArray(data)) {
        throw new Error("Received an invalid analytics response from the server.");
      }

      setTransactions(data);
    } catch (fetchError) {
      console.error("Error fetching analytics:", fetchError);
      setTransactions([]);
      setError(
        fetchError.message === "Failed to fetch"
          ? `Backend is offline. Start the server on ${API_BASE_URL} and try again.`
          : fetchError.message
      );
    } finally {
      setLoading(false);
    }
  }, [period, selectedMonth, selectedYear, userId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const { lineData, categoryData, summary, availableYears } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    const expenseByTime = new Map();
    const expenseByCategory = new Map();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const amount = Number(transaction.amount) || 0;

      if (transaction.type === "income") {
        income += amount;
        return;
      }

      expenses += amount;

      const timeKey = period === "monthly"
        ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : date.toLocaleDateString("en-IN", { month: "short" });

      expenseByTime.set(timeKey, (expenseByTime.get(timeKey) || 0) + amount);

      const categoryName = getAnalyticsCategoryName(transaction) || "Other";
      expenseByCategory.set(categoryName, (expenseByCategory.get(categoryName) || 0) + amount);
    });

    const currentYear = new Date().getFullYear();
    const yearsFromTransactions = Array.from(
      new Set(
        transactions
          .map((transaction) => new Date(transaction.date).getFullYear())
          .filter((year) => Number.isFinite(year))
      )
    );
    const normalizedYears = Array.from(new Set([currentYear, selectedYear, ...yearsFromTransactions]))
      .sort((firstYear, secondYear) => secondYear - firstYear);

    return {
      lineData: Array.from(expenseByTime, ([date, expense]) => ({ date, expense })),
      categoryData: Array.from(expenseByCategory, ([name, value], index) => ({
        name,
        value,
        color: getCategoryColor(name, index)
      })),
      summary: {
        income,
        expenses,
        savings: income - expenses
      },
      availableYears: normalizedYears
    };
  }, [period, selectedYear, transactions]);

  const maxCategoryValue = useMemo(
    () => (categoryData.length ? Math.max(...categoryData.map((category) => category.value)) : 0),
    [categoryData]
  );

  const handleExport = () => {
    const csvRows = [["Date", "Category", "Type", "Amount"]];

    transactions.forEach((transaction) => {
      csvRows.push([transaction.date, transaction.category || "Other", transaction.type, transaction.amount]);
    });

    const csvContent = `data:text/csv;charset=utf-8,${csvRows
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
      .join("\n")}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Pennywise_${period}_${selectedYear}${period === "monthly" ? `_${selectedMonth}` : ""}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="analyticsPage analyticsLoading">Loading analytics...</div>;
  }

  return (
    <div className="analyticsPage">
      {error && <div className="analyticsEmptyState">{error}</div>}

      <div className="analyticsToolbarCard">
        <div className="analyticsToolbarGroup">
          <div className="analyticsSegment">
            <button
              onClick={() => setPeriod("monthly")}
              className={`analyticsToggleButton ${
                period === "monthly" ? "analyticsToggleButton--active" : ""
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod("yearly")}
              className={`analyticsToggleButton ${
                period === "yearly" ? "analyticsToggleButton--active" : ""
              }`}
            >
              Yearly
            </button>
          </div>

          <div className="analyticsSelectGroup">
            {period === "monthly" && (
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(Number(event.target.value))}
                className="analyticsSelect"
              >
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="analyticsSelect"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="analyticsToolbarActions">
          <button onClick={handleExport} className="analyticsExportButton">
            Export CSV
          </button>

          <div className="analyticsSegment">
            <button
              onClick={() => setChartType("graph")}
              className={`analyticsToggleButton ${
                chartType === "graph" ? "analyticsToggleButton--active" : ""
              }`}
            >
              Graph
            </button>
            <button
              onClick={() => setChartType("pie")}
              className={`analyticsToggleButton ${
                chartType === "pie" ? "analyticsToggleButton--active" : ""
              }`}
            >
              Pie
            </button>
          </div>
        </div>
      </div>

      <div className="analyticsCard">
        <h2 className="analyticsCardTitle">Expense Breakdown</h2>
        <div className="analyticsChartWrap">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "graph" ? (
              <LineChart data={lineData}>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value) => formatAmount(value)}
                  contentStyle={{
                    backgroundColor: "#1b2759",
                    border: "1px solid rgba(106, 128, 205, 0.24)",
                    borderRadius: "12px"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="#4c92ff"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#4c92ff" }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            ) : (
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={120}
                  innerRadius={80}
                  paddingAngle={5}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatAmount(value)}
                  contentStyle={{
                    backgroundColor: "#1b2759",
                    border: "1px solid rgba(106, 128, 205, 0.24)",
                    borderRadius: "12px"
                  }}
                />
                <Legend wrapperStyle={{ color: "#dbe5ff", paddingTop: "12px" }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="analyticsBottomGrid">
        <div className="analyticsCard analyticsCategoryCard">
          <h3 className="analyticsCardTitle">Spending by Category</h3>
          {categoryData.length > 0 ? (
            categoryData.map((category) => (
              <div key={category.name} className="analyticsCategoryRow">
                <div className="analyticsCategoryLabelRow">
                  <span className="analyticsCategoryLabelName">{category.name}</span>
                  <span className="analyticsCategoryLabelValue">{formatAmount(category.value)}</span>
                </div>
                <div className="analyticsProgressTrack">
                  <div
                    className="analyticsProgressFill"
                    style={{
                      width: `${maxCategoryValue ? (category.value / maxCategoryValue) * 100 : 0}%`,
                      background: category.color
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="analyticsEmptyState">No expense data for this period.</p>
          )}
        </div>

        <div className="analyticsCard analyticsSummaryCard">
          <h3 className="analyticsCardTitle">Financial Summary</h3>
          <div className="analyticsSummaryItems">
            <div className="analyticsSummaryItem">
              <span className="analyticsSummaryLabel">Income</span>
              <span className="analyticsSummaryValue analyticsSummaryValue--income">
                +{formatAmount(summary.income)}
              </span>
            </div>
            <div className="analyticsSummaryItem">
              <span className="analyticsSummaryLabel">Expenses</span>
              <span className="analyticsSummaryValue analyticsSummaryValue--expense">
                -{formatAmount(summary.expenses)}
              </span>
            </div>
            <div className="analyticsSummaryItem analyticsSummaryItem--highlight">
              <span className="analyticsSummaryLabel">Savings</span>
              <span className="analyticsSummaryValue analyticsSummaryValue--savings">
                {formatAmount(summary.savings)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
