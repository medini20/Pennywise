import React, { useEffect, useState } from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle, Edit2, Check, X } from "lucide-react";
import "./Alerts.css";

const API_BASE_URL = "http://localhost:5001";

export default function AlertsView() {
  const [budget, setBudget] = useState(5000);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(5000);
  const [currentSpending, setCurrentSpending] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [newAlertPercentage, setNewAlertPercentage] = useState("");
  const [showAddAlertDialog, setShowAddAlertDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [isSavingAlert, setIsSavingAlert] = useState(false);
  const [deletingAlertId, setDeletingAlertId] = useState(null);

  const loadAlertData = async () => {
    setIsLoading(true);
    setStatusMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/alerts/data`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load alerts right now.");
      }

      const storedSpending = Number(localStorage.getItem("currentSpending")) || 0;
      const backendSpending = Number(data.current_spending) || 0;
      const nextBudget = Number(data.budget) || 5000;
      const nextAlerts = Array.isArray(data.alerts) ? data.alerts : [];

      setBudget(nextBudget);
      setTempBudget(nextBudget);
      setCurrentSpending(backendSpending > 0 ? backendSpending : storedSpending);
      setAlerts(nextAlerts);

      localStorage.setItem("totalBudget", String(nextBudget));
    } catch (error) {
      setStatusMessage(error.message || "Unable to load alerts right now.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlertData();
  }, []);

  const spentPercentage = budget > 0 ? (currentSpending / budget) * 100 : 0;

  const handleSaveBudget = async () => {
    const amount = Number(tempBudget);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatusMessage("Please enter a valid budget amount.");
      return;
    }

    setIsSavingBudget(true);
    setStatusMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/alerts/budget`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save the budget.");
      }

      setBudget(amount);
      setTempBudget(amount);
      setIsEditingBudget(false);
      setStatusMessage(data.message || "Budget saved successfully.");
      localStorage.setItem("totalBudget", String(amount));
    } catch (error) {
      setStatusMessage(error.message || "Unable to save the budget.");
    } finally {
      setIsSavingBudget(false);
    }
  };

  const closeDialog = () => {
    setShowAddAlertDialog(false);
    setErrorMessage("");
    setNewAlertPercentage("");
  };

  const handleAddAlert = async () => {
    const percentage = parseInt(newAlertPercentage, 10);
    if (Number.isNaN(percentage)) {
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

    setIsSavingAlert(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ threshold_percent: percentage })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to add alert.");
      }

      setAlerts((prevAlerts) =>
        [...prevAlerts, { id: data.alert_id, percentage }]
          .sort((a, b) => a.percentage - b.percentage)
      );
      setStatusMessage(data.message || "Alert added successfully.");
      closeDialog();
    } catch (error) {
      setErrorMessage(error.message || "Unable to add alert.");
    } finally {
      setIsSavingAlert(false);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    setDeletingAlertId(alertId);
    setStatusMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete alert.");
      }

      setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== alertId));
      setStatusMessage(data.message || "Alert deleted successfully.");
    } catch (error) {
      setStatusMessage(error.message || "Unable to delete alert.");
    } finally {
      setDeletingAlertId(null);
    }
  };

  return (
    <div className="alerts-page">
      {statusMessage && <p className="error-text">{statusMessage}</p>}

      <div className="budget-card">
        {!isEditingBudget ? (
          <button
            className="edit-btn"
            onClick={() => {
              setIsEditingBudget(true);
              setTempBudget(budget);
              setStatusMessage("");
            }}
          >
            <Edit2 size={18} />
          </button>
        ) : (
          <div className="edit-actions">
            <button
              className="save-btn"
              onClick={handleSaveBudget}
              disabled={isSavingBudget}
              style={{ background: "#065f46", border: "none", padding: "8px", borderRadius: "8px", color: "#34d399", cursor: "pointer", marginRight: "8px" }}
            >
              <Check size={18} />
            </button>
            <button
              className="cancel-edit-btn"
              onClick={() => {
                setIsEditingBudget(false);
                setTempBudget(budget);
                setStatusMessage("");
              }}
              disabled={isSavingBudget}
              style={{ background: "#7f1d1d", border: "none", padding: "8px", borderRadius: "8px", color: "#f87171", cursor: "pointer" }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        <p className="card-label">Monthly Budget</p>

        {isEditingBudget ? (
          <input
            type="number"
            value={tempBudget}
            onChange={(e) => setTempBudget(e.target.value)}
            className="modal-input"
            style={{ width: "200px", fontSize: "24px", marginBottom: "12px" }}
            autoFocus
          />
        ) : (
          <h2 className="budget-value">₹{budget.toLocaleString()}</h2>
        )}

        <div className="progress-stats">
          <span>Current Spending: ₹{currentSpending.toLocaleString()}</span>
          <span style={{ color: "#10b981" }}>{spentPercentage.toFixed(1)}%</span>
        </div>

        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${Math.min(spentPercentage, 100)}%` }} />
        </div>

        <p className="remaining-text">Remaining: ₹{Math.max(budget - currentSpending, 0).toLocaleString()}</p>
      </div>

      <div className="section-header">
        <h3>Alert Thresholds</h3>
        <button className="add-alert-trigger" onClick={() => setShowAddAlertDialog(true)}>
          <Plus size={18} /> Add Alert
        </button>
      </div>

      {isLoading ? (
        <div className="alerts-list">
          <p className="alert-subtitle">Loading alerts...</p>
        </div>
      ) : (
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
                  onClick={() => handleDeleteAlert(alert.id)}
                  disabled={deletingAlertId === alert.id}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
          {alerts.length === 0 && (
            <p className="alert-subtitle">No alert thresholds yet. Add one to start tracking.</p>
          )}
        </div>
      )}

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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddAlert();
                  }
                }}
                placeholder="e.g., 50, 75, 90"
                autoFocus
              />
              {errorMessage && <p className="error-text">{errorMessage}</p>}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeDialog}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddAlert} disabled={isSavingAlert}>
                Add Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
