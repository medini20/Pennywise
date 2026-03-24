import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import "./Analytics.css";

const categoryColors = {
  "Food & Dining": "#22d3ee",
  "Transportation": "#8b5cf6",
  "Shopping": "#facc15",
  "Entertainment": "#a855f7",
  "Utilities": "#ef4444",
  "Education": "#10b981",
  "Other": "#3b82f6"
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const years = [2024, 2025, 2026];

function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [chartType, setChartType] = useState("graph");
  const [period, setPeriod] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const [lineData, setLineData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, savings: 0 });

  // 1. Fetch logic - Currently fetching "All" data to filter locally. 
  // In a final version, you would pass Month/Year to the API.
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // REPLACE THIS with your real API call: const response = await axios.get('/api/transactions');
      const dummyData = [
        { date: "2026-03-01", amount: 500, type: "expense", category: "Food & Dining" },
        { date: "2026-03-08", amount: 470, type: "expense", category: "Transportation" },
        { date: "2026-03-15", amount: 1200, type: "expense", category: "Shopping" },
        { date: "2026-02-10", amount: 300, type: "expense", category: "Education" }, // Previous month
        { date: "2026-03-02", amount: 15000, type: "income", category: "Salary" }
      ];
      setTransactions(dummyData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Process Data based on selection
  const processAnalytics = useCallback(() => {
    let income = 0;
    let expenses = 0;
    const dateMap = {};
    const categoryMap = {};

    // Filter transactions based on UI selection
    const filtered = transactions.filter((t) => {
      const d = new Date(t.date);
      const mMatch = d.getMonth() + 1 === parseInt(selectedMonth);
      const yMatch = d.getFullYear() === parseInt(selectedYear);
      return period === "monthly" ? (mMatch && yMatch) : yMatch;
    });

    filtered.forEach((t) => {
      const dateObj = new Date(t.date);
      const key = period === "monthly"
        ? dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : dateObj.toLocaleDateString("en-IN", { month: "short" });

      if (t.type === "income") {
        income += t.amount;
      } else {
        expenses += t.amount;
        // Group by Date for Line Chart
        if (!dateMap[key]) dateMap[key] = 0;
        dateMap[key] += t.amount;
        // Group by Category for Pie Chart
        const cat = t.category || "Other";
        if (!categoryMap[cat]) categoryMap[cat] = 0;
        categoryMap[cat] += t.amount;
      }
    });

    setLineData(Object.keys(dateMap).map((d) => ({ date: d, expense: dateMap[d] })));
    setCategoryData(Object.keys(categoryMap).map((cat) => ({
      name: cat,
      value: categoryMap[cat],
      color: categoryColors[cat] || "#3b82f6"
    })));
    setSummary({ income, expenses, savings: income - expenses });
  }, [transactions, period, selectedMonth, selectedYear]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
  useEffect(() => { processAnalytics(); }, [processAnalytics]);

  // 3. Export to CSV
  const handleExport = () => {
    const csvRows = [["Date", "Category", "Type", "Amount"]];
    const filtered = transactions.filter((t) => {
      const d = new Date(t.date);
      return period === "monthly" 
        ? (d.getMonth() + 1 === parseInt(selectedMonth) && d.getFullYear() === parseInt(selectedYear))
        : d.getFullYear() === parseInt(selectedYear);
    });

    filtered.forEach(t => csvRows.push([t.date, t.category, t.type, t.amount]));
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Pennywise_${period}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const maxCategoryValue = useMemo(() => 
    categoryData.length ? Math.max(...categoryData.map(c => c.value)) : 0
  , [categoryData]);

  if (loading) {
    return <div className="analyticsPage analyticsLoading">Loading analytics...</div>;
  }

  return (
    <div className="analyticsPage">
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
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="analyticsSelect"
              >
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            )}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="analyticsSelect"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
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
                <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={120} innerRadius={80} paddingAngle={5}>
                  {categoryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip
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
          {categoryData.length > 0 ? categoryData.map((cat, i) => (
            <div key={i} className="analyticsCategoryRow">
              <div className="analyticsCategoryLabelRow">
                <span className="analyticsCategoryLabelName">{cat.name}</span>
                <span className="analyticsCategoryLabelValue">₹{cat.value}</span>
              </div>
              <div className="analyticsProgressTrack">
                <div
                  className="analyticsProgressFill"
                  style={{
                    width: `${maxCategoryValue ? (cat.value / maxCategoryValue) * 100 : 0}%`,
                    background: cat.color
                  }}
                />
              </div>
            </div>
          )) : <p className="analyticsEmptyState">No data for this period.</p>}
        </div>

        <div className="analyticsCard analyticsSummaryCard">
          <h3 className="analyticsCardTitle">Financial Summary</h3>
          <div className="analyticsSummaryItems">
            <div className="analyticsSummaryItem">
              <span className="analyticsSummaryLabel">Income</span>
              <span className="analyticsSummaryValue analyticsSummaryValue--income">
                +₹{summary.income}
              </span>
            </div>
            <div className="analyticsSummaryItem">
              <span className="analyticsSummaryLabel">Expenses</span>
              <span className="analyticsSummaryValue analyticsSummaryValue--expense">
                -₹{summary.expenses}
              </span>
            </div>
            <div className="analyticsSummaryItem analyticsSummaryItem--highlight">
              <span className="analyticsSummaryLabel">Savings</span>
              <span className="analyticsSummaryValue analyticsSummaryValue--savings">
                ₹{summary.savings}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
