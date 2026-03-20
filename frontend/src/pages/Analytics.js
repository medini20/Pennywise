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

  // 1. Fetch logic
  const fetchTransactions = useCallback(async () => {
    const dummyTransactions = [
      { date: "2026-01-01", amount: 500, type: "expense", category: "Food & Dining" },
      { date: "2026-01-08", amount: 470, type: "expense", category: "Transportation" },
      { date: "2026-01-15", amount: 435, type: "expense", category: "Shopping" },
      { date: "2026-01-18", amount: 325, type: "expense", category: "Entertainment" },
      { date: "2026-01-20", amount: 320, type: "expense", category: "Utilities" },
      { date: "2026-01-22", amount: 300, type: "expense", category: "Education" },
      { date: "2026-01-02", amount: 10000, type: "income", category: "Salary" }
    ];
    setTransactions(dummyTransactions);
    setLoading(false);
  }, []);

  // 2. FIXED: Wrapped processAnalytics in useCallback to kill the warning
  const processAnalytics = useCallback(() => {
    let income = 0;
    let expenses = 0;
    const dateMap = {};
    const categoryMap = {};

    transactions.forEach((t) => {
      const dateObj = new Date(t.date);
      const key = period === "monthly"
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

    const lineChartData = Object.keys(dateMap).map((d) => ({ date: d, expense: dateMap[d] }));
    const categoryChartData = Object.keys(categoryMap).map((cat) => ({
      name: cat,
      value: categoryMap[cat],
      color: categoryColors[cat] || "#3b82f6"
    }));

    setLineData(lineChartData);
    setCategoryData(categoryChartData);
    setSummary({ income, expenses, savings: income - expenses });
  }, [transactions, period]); // Now watches transactions and period correctly

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (transactions.length) {
      processAnalytics();
    }
  }, [transactions, period, processAnalytics]); // Dependency array is now complete

  const maxCategoryValue = useMemo(() => {
    if (!categoryData.length) return 0;
    return Math.max(...categoryData.map((c) => c.value));
  }, [categoryData]);

  if (loading) {
    return (
      <div className="p-10 text-white">Loading analytics...</div>
    );
  }

  return (
    <div className="w-full p-6 text-white box-border">
      {/* Top Controls */}
      <div className="flex justify-center gap-6 mb-8">
        <div className="flex bg-[#101a3a] rounded-lg p-1">
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-6 py-2 rounded-lg transition-colors ${period === "monthly" ? "bg-blue-600" : "hover:bg-blue-900/30"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriod("yearly")}
            className={`px-6 py-2 rounded-lg transition-colors ${period === "yearly" ? "bg-blue-600" : "hover:bg-blue-900/30"}`}
          >
            Yearly
          </button>
        </div>

        <div className="flex bg-[#101a3a] rounded-lg p-1">
          <button
            onClick={() => setChartType("graph")}
            className={`px-6 py-2 rounded-lg transition-colors ${chartType === "graph" ? "bg-blue-600" : "hover:bg-blue-900/30"}`}
          >
            Show Graph
          </button>
          <button
            onClick={() => setChartType("pie")}
            className={`px-6 py-2 rounded-lg transition-colors ${chartType === "pie" ? "bg-blue-600" : "hover:bg-blue-900/30"}`}
          >
            Show Pie Chart
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-[#0f1b3d] rounded-xl p-6 mb-10 shadow-lg border border-white/5">
        <h2 className="text-xl font-semibold mb-4">Expenses Analytics</h2>
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "graph" ? (
              <LineChart data={lineData}>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="expense" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            ) : (
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={100} innerRadius={60} paddingAngle={5}>
                  {categoryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Legend iconType="circle" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#0f1b3d] p-6 rounded-xl shadow-lg border border-white/5">
          <h2 className="text-xl font-semibold mb-6">Categories</h2>
          {categoryData.map((cat, i) => (
            <div key={i} className="mb-6">
              <div className="flex justify-between mb-2 text-sm font-medium">
                <span>{cat.name}</span>
                <span>₹{cat.value}</span>
              </div>
              <div className="w-full bg-[#1e293b] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(cat.value / maxCategoryValue) * 100}%`, background: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#0f1b3d] p-6 rounded-xl shadow-lg border border-white/5 h-fit">
          <h2 className="text-xl font-semibold mb-6">Summary</h2>
          <div className="space-y-4">
            <div className="bg-[#111d40] p-4 rounded-lg flex justify-between items-center">
              <span className="text-slate-400">Income</span>
              <span className="text-green-400 font-bold text-lg">+₹{summary.income}</span>
            </div>
            <div className="bg-[#111d40] p-4 rounded-lg flex justify-between items-center">
              <span className="text-slate-400">Expenses</span>
              <span className="text-red-400 font-bold text-lg">-₹{summary.expenses}</span>
            </div>
            <div className="bg-[#111d40] p-4 rounded-lg flex justify-between items-center border-t border-white/5 pt-4">
              <span className="text-slate-400">Savings</span>
              <span className="text-yellow-400 font-bold text-xl">₹{summary.savings}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;