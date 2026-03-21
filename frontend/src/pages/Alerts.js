import React, { useState, useEffect } from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle, Edit2, Check, X } from "lucide-react";

export default function AlertsView() {
  const [budget, setBudget] = useState(() => {
    const saved = localStorage.getItem("totalBudget");
    return saved ? parseFloat(saved) : 5000;
  });
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(budget);
  const [currentSpending, setCurrentSpending] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [newAlertPercentage, setNewAlertPercentage] = useState("");
  const [showAddAlertDialog, setShowAddAlertDialog] = useState(false);
  
  // New state for showing a red error message inside the modal
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const savedAlerts = JSON.parse(localStorage.getItem("budgetAlerts"));
    if (Array.isArray(savedAlerts) && savedAlerts.length > 0) {
      setAlerts(savedAlerts.filter(a => a.percentage !== 40));
    } else {
      setAlerts([
        { id: 2, percentage: 50 },
        { id: 3, percentage: 75 },
        { id: 4, percentage: 90 }
      ]);
    }
    const savedSpending = localStorage.getItem("currentSpending");
    if (savedSpending) setCurrentSpending(parseFloat(savedSpending));
  }, []);

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
    
    // 1. Basic Validation (Empty/Not a Number)
    if (isNaN(percentage)) {
      setErrorMessage("Please enter a valid number");
      return;
    }

    // 2. Limit Validation (More than 100)
    if (percentage > 100) {
      setErrorMessage("Value is wrong. Please enter less than 100%");
      return;
    }

    // 3. Zero/Negative Validation
    if (percentage <= 0) {
      setErrorMessage("Please enter a value greater than 0");
      return;
    }

    // 4. DUPLICATE CHECK
    const alreadyExists = alerts.some(alert => alert.percentage === percentage);
    if (alreadyExists) {
      setErrorMessage(`An alert for ${percentage}% already exists!`);
      return;
    }

    // Success: Clear error and add alert
    setErrorMessage("");
    const newAlert = { id: Date.now(), percentage };
    setAlerts([...alerts, newAlert].sort((a, b) => a.percentage - b.percentage));
    setNewAlertPercentage("");
    setShowAddAlertDialog(false);
  };

  return (
    <div className="alerts-page" style={{ color: "white", padding: "20px", position: "relative", minHeight: "100vh" }}>
      
      {/* Monthly Budget Card */}
      <div style={{ background: "#13234535", border: "1px solid #4c88e2", borderRadius: "16px", padding: "24px", marginBottom: "32px", position: "relative" }}>
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
        <div style={{ height: "10px", width: "100%", background: "#073b80", borderRadius: "10px", overflow: "hidden" }}>
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
            <div key={alert.id} style={{ background: "#021849", border: `1px solid ${isTriggered ? "#065f46" : "#1f2937"}`, borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: isTriggered ? "#064e3b" : "#1f2937", display: "flex", alignItems: "center", justifyContent: "center", color: isTriggered ? "#34d399" : "#9ca3af" }}>
                   {isTriggered ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: "600", fontSize: "16px" }}>{alert.percentage}% Alert</span>
                    {isTriggered && <span style={{ background: "#065f46", color: "#34d399", fontSize: "10px", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>TRIGGERED</span>}
                  </div>
                  <p style={{ margin: "4px 0 0 0", color: "#f1f4f8", fontSize: "12px" }}>Triggers at ₹{triggerAmount}</p>
                </div>
              </div>
              <button onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer" }}><Trash2 size={18} /></button>
            </div>
          );
        })}
      </div>

      {/* FIGMA STYLE MODAL OVERLAY */}
      {showAddAlertDialog && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#1f2937", width: "400px", borderRadius: "16px", padding: "24px", position: "relative" }}>
            <button onClick={() => { setShowAddAlertDialog(false); setErrorMessage(""); }} style={{ position: "absolute", right: "16px", top: "16px", background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>Add Alert</h3>
            <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "20px" }}>
              Get notified when your spending reaches a certain percentage of your budget.
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "8px" }}>Alert Percentage (%)</label>
              <input 
                type="number" 
                value={newAlertPercentage} 
                onChange={(e) => {
                  setNewAlertPercentage(e.target.value);
                  setErrorMessage(""); // Clear error while typing
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddAlert(); }}
                placeholder="e.g., 50, 75, 90" 
                autoFocus
                style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: errorMessage ? "1px solid #ef4444" : "1px solid #374151", color: "white", padding: "12px", borderRadius: "8px", outline: "none", boxSizing: "border-box" }}
              />
              {errorMessage && <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px", fontWeight: "500" }}>{errorMessage}</p>}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => { setShowAddAlertDialog(false); setErrorMessage(""); }} style={{ flex: 1, background: "#374151", color: "white", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleAddAlert} style={{ flex: 1, background: "#facc15", color: "black", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Add Alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}