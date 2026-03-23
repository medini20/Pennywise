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

  if (loading) return <div className="p-10 text-white">Loading analytics...</div>;

  return (
    <div className="w-full p-6 text-white bg-[#0a0f29] min-h-screen">
      {/* Filters & Controls */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8 bg-[#111d40] p-4 rounded-xl border border-white/5">
        <div className="flex gap-4 items-center">
          <div className="flex bg-[#0a0f29] rounded-lg p-1">
            <button onClick={() => setPeriod("monthly")} className={`px-4 py-1.5 rounded-lg text-sm ${period === "monthly" ? "bg-blue-600" : ""}`}>Monthly</button>
            <button onClick={() => setPeriod("yearly")} className={`px-4 py-1.5 rounded-lg text-sm ${period === "yearly" ? "bg-blue-600" : ""}`}>Yearly</button>
          </div>

          <div className="flex gap-2">
            {period === "monthly" && (
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-[#0a0f29] border border-white/10 rounded-md px-2 py-1 text-sm outline-none">
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            )}
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-[#0a0f29] border border-white/10 rounded-md px-2 py-1 text-sm outline-none">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg text-sm font-medium transition-all">Export CSV</button>
          <div className="flex bg-[#0a0f29] rounded-lg p-1">
            <button onClick={() => setChartType("graph")} className={`px-4 py-1.5 rounded-lg text-sm ${chartType === "graph" ? "bg-blue-600" : ""}`}>Graph</button>
            <button onClick={() => setChartType("pie")} className={`px-4 py-1.5 rounded-lg text-sm ${chartType === "pie" ? "bg-blue-600" : ""}`}>Pie</button>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="bg-[#0f1b3d] rounded-xl p-6 mb-8 shadow-lg border border-white/5">
        <h2 className="text-xl font-semibold mb-6">Expense Breakdown</h2>
        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "graph" ? (
              <LineChart data={lineData}>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="expense" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: '#3b82f6' }} activeDot={{ r: 8 }} />
              </LineChart>
            ) : (
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={120} innerRadius={80} paddingAngle={5}>
                  {categoryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary and Progress Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0f1b3d] p-6 rounded-xl border border-white/5">
          <h3 className="text-lg font-medium mb-6">Spending by Category</h3>
          {categoryData.length > 0 ? categoryData.map((cat, i) => (
            <div key={i} className="mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span>{cat.name}</span>
                <span className="font-bold">₹{cat.value}</span>
              </div>
              <div className="w-full bg-[#1e293b] h-2 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(cat.value / maxCategoryValue) * 100}%`, background: cat.color }} />
              </div>
            </div>
          )) : <p className="text-slate-400">No data for this period.</p>}
        </div>

        <div className="bg-[#0f1b3d] p-6 rounded-xl border border-white/5 space-y-4">
          <h3 className="text-lg font-medium mb-2">Financial Summary</h3>
          <div className="p-4 bg-[#111d40] rounded-lg border border-white/5 flex justify-between">
            <span className="text-slate-400">Income</span>
            <span className="text-green-400 font-bold text-lg">+₹{summary.income}</span>
          </div>
          <div className="p-4 bg-[#111d40] rounded-lg border border-white/5 flex justify-between">
            <span className="text-slate-400">Expenses</span>
            <span className="text-red-400 font-bold text-lg">-₹{summary.expenses}</span>
          </div>
          <div className="p-4 bg-[#111d40] rounded-lg border-t border-blue-500/30 flex justify-between">
            <span className="text-slate-400">Savings</span>
            <span className="text-yellow-400 font-bold text-xl">₹{summary.savings}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;