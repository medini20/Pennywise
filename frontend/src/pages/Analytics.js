import React, { useEffect, useState, useMemo } from "react";
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

const categoryColors = {
  "Food & Dining": "#22d3ee",
  Transportation: "#8b5cf6",
  Shopping: "#facc15",
  Entertainment: "#a855f7",
  Utilities: "#ef4444",
  Education: "#10b981",
  Other: "#3b82f6"
};

function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [chartType, setChartType] = useState("graph");
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);

  const [lineData, setLineData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [summary, setSummary] = useState({
    income: 0,
    expenses: 0,
    savings: 0
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (transactions.length) {
      processAnalytics();
    }
  }, [transactions, period]);
//dummy data-----------------------------------------------------------------------------
  const fetchTransactions = async () => {

  const dummyTransactions = [
    {
      date: "2026-01-01",
      amount: 500,
      type: "expense",
      category: "Food & Dining"
    },
    {
      date: "2026-01-08",
      amount: 470,
      type: "expense",
      category: "Transportation"
    },
    {
      date: "2026-01-15",
      amount: 435,
      type: "expense",
      category: "Shopping"
    },
    {
      date: "2026-01-18",
      amount: 325,
      type: "expense",
      category: "Entertainment"
    },
    {
      date: "2026-01-20",
      amount: 320,
      type: "expense",
      category: "Utilities"
    },
    {
      date: "2026-01-22",
      amount: 300,
      type: "expense",
      category: "Education"
    },
    {
      date: "2026-01-02",
      amount: 10000,
      type: "income",
      category: "Salary"
    }
  ];

  setTransactions(dummyTransactions);
  setLoading(false);
};
//-----------------------------------------------------------
  const processAnalytics = () => {
    let income = 0;
    let expenses = 0;

    const dateMap = {};
    const categoryMap = {};

    transactions.forEach((t) => {
      const dateObj = new Date(t.date);

      const key =
        period === "monthly"
          ? dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          : dateObj.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

      if (t.type === "income") {
        income += t.amount;
      } else {
        expenses += t.amount;

        if (!dateMap[key]) dateMap[key] = 0;
        dateMap[key] += t.amount;

        const cat = t.category || "Other";

        if (!categoryMap[cat]) categoryMap[cat] = 0;
        categoryMap[cat] += t.amount;
      }
    });

    const lineChartData = Object.keys(dateMap).map((d) => ({
      date: d,
      expense: dateMap[d]
    }));

    const categoryChartData = Object.keys(categoryMap).map((cat) => ({
      name: cat,
      value: categoryMap[cat],
      color: categoryColors[cat] || "#3b82f6"
    }));

    setLineData(lineChartData);
    setCategoryData(categoryChartData);

    setSummary({
      income,
      expenses,
      savings: income - expenses
    });
  };

  const maxCategoryValue = useMemo(() => {
    if (!categoryData.length) return 0;
    return Math.max(...categoryData.map((c) => c.value));
  }, [categoryData]);

  if (loading) {
    return (
      <div className="text-white p-10 bg-[#0b1026] min-h-screen">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="bg-[#0b1026] min-h-screen text-white p-6">

      {/* Top Controls */}
      <div className="flex justify-center gap-6 mb-8">

        <div className="flex bg-[#101a3a] rounded-lg p-1">
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-6 py-2 rounded-lg ${
              period === "monthly" ? "bg-blue-600" : ""
            }`}
          >
            Monthly
          </button>

          <button
            onClick={() => setPeriod("yearly")}
            className={`px-6 py-2 rounded-lg ${
              period === "yearly" ? "bg-blue-600" : ""
            }`}
          >
            Yearly
          </button>
        </div>

        <div className="flex bg-[#101a3a] rounded-lg p-1">
          <button
            onClick={() => setChartType("graph")}
            className={`px-6 py-2 rounded-lg ${
              chartType === "graph" ? "bg-blue-600" : ""
            }`}
          >
            Show Graph
          </button>

          <button
            onClick={() => setChartType("pie")}
            className={`px-6 py-2 rounded-lg ${
              chartType === "pie" ? "bg-blue-600" : ""
            }`}
          >
            Show Pie Chart
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#0f1b3d] rounded-xl p-6 mb-10 shadow-lg">

        <h2 className="text-xl font-semibold mb-4">
          Expenses Analytics
        </h2>

        {chartType === "graph" ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <XAxis dataKey="date" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="#3b82f6"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                outerRadius={110}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>

              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-3 gap-8">

        {/* Category Breakdown */}
        <div className="col-span-2 bg-[#0f1b3d] p-6 rounded-xl shadow-lg">

          <h2 className="text-xl font-semibold mb-6">
            Categories
          </h2>

          {categoryData.map((cat, i) => (
            <div key={i} className="mb-6">

              <div className="flex justify-between mb-1">
                <span>{cat.name}</span>
                <span>₹{cat.value}</span>
              </div>

              <div className="w-full bg-gray-700 h-2 rounded">

                <div
                  className="h-2 rounded"
                  style={{
                    width: `${(cat.value / maxCategoryValue) * 100}%`,
                    background: cat.color
                  }}
                />

              </div>

            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-[#0f1b3d] p-6 rounded-xl shadow-lg">

          <h2 className="text-xl font-semibold mb-6">
            Monthly Summary
          </h2>

          <div className="bg-[#111d40] p-4 rounded mb-4 flex justify-between">
            <span>Income</span>
            <span className="text-green-400 font-semibold">
              +₹{summary.income}
            </span>
          </div>

          <div className="bg-[#111d40] p-4 rounded mb-4 flex justify-between">
            <span>Expenses</span>
            <span className="text-red-400 font-semibold">
              -₹{summary.expenses}
            </span>
          </div>

          <div className="bg-[#111d40] p-4 rounded flex justify-between">
            <span>Savings</span>
            <span className="text-yellow-400 font-semibold">
              ₹{summary.savings}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Analytics;