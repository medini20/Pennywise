import React, { useState, useEffect } from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle, Edit2, Check, X } from "lucide-react";

export default function AlertsView() {
  // 1. Budget State
  const [budget, setBudget] = useState(() => {
    const saved = localStorage.getItem("totalBudget");
    return saved ? parseFloat(saved) : 5000;
  });
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(budget);

  // 2. Spending State
  const [currentSpending, setCurrentSpending] = useState(0);

  // 3. Alerts States
  const [alerts, setAlerts] = useState([]);
  const [newAlertPercentage, setNewAlertPercentage] = useState("");
  const [showAddAlertDialog, setShowAddAlertDialog] = useState(false);

  // Load data and remove 40% alert specifically
  useEffect(() => {
    const savedAlerts = JSON.parse(localStorage.getItem("budgetAlerts"));
    
    if (Array.isArray(savedAlerts) && savedAlerts.length > 0) {
      // Filter out any existing 40% alerts to clean the UI
      const filtered = savedAlerts.filter(a => a.percentage !== 40);
      setAlerts(filtered);
    } else {
      // Default set (50, 75, 90) - No 40% here
      setAlerts([
        { id: 2, percentage: 50 },
        { id: 3, percentage: 75 },
        { id: 4, percentage: 90 }
      ]);
    }

    const savedSpending = localStorage.getItem("currentSpending");
    if (savedSpending) setCurrentSpending(parseFloat(savedSpending));

    const handleStorage = () => {
      const updatedSpending = localStorage.getItem("currentSpending");
      if (updatedSpending) setCurrentSpending(parseFloat(updatedSpending));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem("budgetAlerts", JSON.stringify(alerts));
    localStorage.setItem("totalBudget", budget.toString());
  }, [alerts, budget]);

  const spentPercentage = budget > 0 ? (currentSpending / budget) * 100 : 0;

  const handleSaveBudget = () => {
    setBudget(tempBudget);
    setIsEditingBudget(false);
  };

  const handleAddAlert = () => {
    const percentage = parseInt(newAlertPercentage);
    if (!isNaN(percentage) && percentage > 0 && percentage <= 100) {
      const newAlert = { id: Date.now(), percentage };
      setAlerts([...alerts, newAlert].sort((a, b) => a.percentage - b.percentage));
      setNewAlertPercentage("");
      setShowAddAlertDialog(false);
    }
  };

  return (
    <div className="alerts-page" style={{ color: "white", padding: "20px" }}>
      
      {/* Monthly Budget Card */}
      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "16px", padding: "24px", marginBottom: "32px", position: "relative" }}>
        {!isEditingBudget ? (
          <button onClick={() => { setIsEditingBudget(true); setTempBudget(budget); }} style={{ position: "absolute", right: "24px", top: "24px", background: "#1f2937", border: "none", padding: "8px", borderRadius: "8px", color: "#6366f1", cursor: "pointer" }}>
            <Edit2 size={18} />
          </button>
        ) : (
          <div style={{ position: "absolute", right: "24px", top: "24px", display: "flex", gap: "8px" }}>
            <button onClick={handleSaveBudget} style={{ background: "#065f46", border: "none", padding: "8px", borderRadius: "8px", color: "#34d399", cursor: "pointer" }}><Check size={18}/></button>
            <button onClick={() => setIsEditingBudget(false)} style={{ background: "#7f1d1d", border: "none", padding: "8px", borderRadius: "8px", color: "#f87171", cursor: "pointer" }}><X size={18}/></button>
          </div>
        )}
        <p style={{ color: "#9ca3af", fontSize: "14px", margin: "0 0 8px 0" }}>Monthly Budget</p>
        {isEditingBudget ? (
          <input type="number" value={tempBudget} onChange={(e) => setTempBudget(parseFloat(e.target.value))} style={{ fontSize: "32px", background: "transparent", border: "1px solid #6366f1", color: "white", fontWeight: "bold", width: "200px", borderRadius: "8px", marginBottom: "20px", outline: "none", padding: "0 10px" }} autoFocus />
        ) : (
          <h2 style={{ fontSize: "32px", margin: "0 0 20px 0", fontWeight: "bold" }}>₹{budget.toLocaleString()}</h2>
        )}
        <div style={{ height: "10px", width: "100%", background: "#1f2937", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ width: `${Math.min(spentPercentage, 100)}%`, height: "100%", background: "#facc15", transition: "0.5s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
            <p style={{ color: "#9ca3af", fontSize: "14px", margin: 0 }}>Spent: ₹{currentSpending.toLocaleString()}</p>
            <p style={{ color: "#9ca3af", fontSize: "14px", margin: 0 }}>{spentPercentage.toFixed(1)}%</p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "20px", fontWeight: "600", margin: 0 }}>Alert Thresholds</h3>
        <button onClick={() => setShowAddAlertDialog(true)} style={{ background: "#facc15", color: "black", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          <Plus size={18} /> Add Alert
        </button>
      </div>

      {/* Threshold List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {alerts.map((alert) => {
          const isTriggered = spentPercentage >= alert.percentage;
          const triggerAmount = (budget * (alert.percentage / 100)).toLocaleString();
          return (
            <div key={alert.id} style={{ background: "#111827", border: `1px solid ${isTriggered ? "#065f46" : "#1f2937"}`, borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: isTriggered ? "#064e3b" : "#1f2937", display: "flex", alignItems: "center", justifyContent: "center", color: isTriggered ? "#34d399" : "#9ca3af" }}>
                   {isTriggered ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: "600", fontSize: "16px" }}>{alert.percentage}% Alert</span>
                    {isTriggered && <span style={{ background: "#065f46", color: "#34d399", fontSize: "10px", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>TRIGGERED</span>}
                  </div>
                  <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "12px" }}>Triggers at ₹{triggerAmount}</p>
                </div>
              </div>
              <button onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer" }}><Trash2 size={18} /></button>
            </div>
          );
        })}
      </div>

      {/* FIXED Add Alert Dialog */}
      {showAddAlertDialog && (
        <div style={{ marginTop: "20px", padding: "20px", background: "#111827", border: "1px solid #6366f1", borderRadius: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
          <input 
            type="number" 
            value={newAlertPercentage} 
            onChange={(e) => setNewAlertPercentage(e.target.value)}
            placeholder="%" 
            style={{ flex: 1, background: "transparent", border: "1px solid #1f2937", color: "white", padding: "10px", borderRadius: "8px", outline: "none" }}
          />
          <button onClick={handleAddAlert} style={{ background: "#facc15", color: "black", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Add</button>
          <button onClick={() => setShowAddAlertDialog(false)} style={{ background: "transparent", color: "white", border: "1px solid #1f2937", padding: "10px 20px", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
        </div>
      )}
    </div>
  );
}