import React, { useState, useEffect } from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle, Edit2, Check, X } from "lucide-react";
import "./Alerts.css"; // IMPORTANT: Ensure your CSS file is named exactly Alerts.css (Capital A) and is in the same folder!

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
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const savedAlerts = JSON.parse(localStorage.getItem("budgetAlerts"));
    if (Array.isArray(savedAlerts) && savedAlerts.length > 0) {
      setAlerts(savedAlerts.filter((a) => a.percentage !== 40));
    } else {
      setAlerts([
        { id: 2, percentage: 50 },
        { id: 3, percentage: 75 },
        { id: 4, percentage: 90 },
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

  const closeDialog = () => {
    setShowAddAlertDialog(false);
    setErrorMessage("");
    setNewAlertPercentage("");
  };

  const handleAddAlert = () => {
    const percentage = parseInt(newAlertPercentage);
    if (isNaN(percentage)) {
      setErrorMessage("Please enter a valid number");
      return;
    }
    if (percentage > 100) {
      setErrorMessage("Value is wrong. Please enter less than 100%");
      return;
    }
    if (percentage <= 0) {
      setErrorMessage("Please enter a value greater than 0");
      return;
    }
    const alreadyExists = alerts.some((alert) => alert.percentage === percentage);
    if (alreadyExists) {
      setErrorMessage(`An alert for ${percentage}% already exists!`);
      return;
    }

    setErrorMessage("");
    const newAlert = { id: Date.now(), percentage };
    setAlerts([...alerts, newAlert].sort((a, b) => a.percentage - b.percentage));
    closeDialog();
  };

  return (
    <div className="alerts-page">
      {/* Monthly Budget Card */}
      <div className="budget-card">
        {/* RESTORED EDIT BUTTONS */}
        {!isEditingBudget ? (
          <button
            className="edit-btn"
            onClick={() => {
              setIsEditingBudget(true);
              setTempBudget(budget);
            }}
          >
            <Edit2 size={18} />
          </button>
        ) : (
          <div className="edit-actions">
            <button className="save-btn" onClick={handleSaveBudget} style={{ background: "#065f46", border: "none", padding: "8px", borderRadius: "8px", color: "#34d399", cursor: "pointer", marginRight: "8px" }}>
              <Check size={18} />
            </button>
            <button className="cancel-edit-btn" onClick={() => setIsEditingBudget(false)} style={{ background: "#7f1d1d", border: "none", padding: "8px", borderRadius: "8px", color: "#f87171", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>
        )}

        <p className="card-label">Monthly Budget</p>
        
        {/* RESTORED EDIT INPUT */}
        {isEditingBudget ? (
          <input
            type="number"
            value={tempBudget}
            onChange={(e) => setTempBudget(parseFloat(e.target.value))}
            className="modal-input"
            style={{ width: "200px", fontSize: "24px", marginBottom: "12px" }}
            autoFocus
          />
        ) : (
          <h2 className="budget-value">₹{budget.toLocaleString()}</h2>
        )}
        
        <div className="progress-stats">
          <span>Current Spending: ₹{currentSpending.toLocaleString()}</span>
          <span style={{ color: '#10b981' }}>{spentPercentage.toFixed(1)}%</span>
        </div>

        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${Math.min(spentPercentage, 100)}%` }} />
        </div>

        <p className="remaining-text">Remaining: ₹{(budget - currentSpending).toLocaleString()}</p>
      </div>

      <div className="section-header">
        <h3>Alert Thresholds</h3>
        <button className="add-alert-trigger" onClick={() => setShowAddAlertDialog(true)}>
          <Plus size={18} /> Add Alert
        </button>
      </div>

      {/* Threshold List */}
      <div className="alerts-list">
        {alerts.map((alert) => {
          const isTriggered = spentPercentage >= alert.percentage;
          const triggerAmount = (budget * (alert.percentage / 100)).toLocaleString();
          return (
            <div
              key={alert.id}
              className={`alert-item ${isTriggered ? "triggered" : ""}`}
            >
              <div className="alert-item-left">
                <div className="alert-icon-wrapper">
                  {isTriggered ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                </div>
                <div>
                  <div className="alert-title-row">
                    <span className="alert-title">{alert.percentage}% Alert</span>
                    {isTriggered && <span className="triggered-badge">TRIGGERED</span>}
                  </div>
                  <p className="alert-subtitle">Triggers at ₹{triggerAmount}</p>
                </div>
              </div>
              <button
                className="delete-alert-btn"
                onClick={() => setAlerts(alerts.filter((a) => a.id !== alert.id))}
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
      </div>

      {/* MODAL OVERLAY */}
      {showAddAlertDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-icon" onClick={closeDialog}>
              <X size={20} />
            </button>

            <h3 className="modal-title">Add Alert</h3>
            <p className="modal-description">
              Get notified when your spending reaches a certain percentage of your budget.
            </p>

            <div className="modal-input-group">
              <label>Alert Percentage (%)</label>
              <input
                className={`modal-input ${errorMessage ? "input-error" : ""}`}
                type="number"
                value={newAlertPercentage}
                onChange={(e) => {
                  setNewAlertPercentage(e.target.value);
                  setErrorMessage("");
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddAlert(); }}
                placeholder="e.g., 50, 75, 90"
                autoFocus
              />
              {errorMessage && <p className="error-text">{errorMessage}</p>}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeDialog}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddAlert}>
                Add Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}