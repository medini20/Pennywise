import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Edit2,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { getStoredUser } from "../services/authStorage";
import "./Alerts.css";

const API_BASE_URL = "http://localhost:5001";

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString()}`;

const getAlertTone = (percentage) => {
  if (percentage <= 60) {
    return "safe";
  }

  if (percentage <= 85) {
    return "warning";
  }

  return "danger";
};

export default function AlertsView() {
  const storedUser = getStoredUser();
  const userId = storedUser?.id ?? storedUser?.user_id ?? null;
  const [budget, setBudget] = useState(5000);
  const [tempBudget, setTempBudget] = useState(5000);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [currentSpending, setCurrentSpending] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [showAddAlertDialog, setShowAddAlertDialog] = useState(false);
  const [newAlertPercentage, setNewAlertPercentage] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [isSavingAlert, setIsSavingAlert] = useState(false);
  const [deletingAlertId, setDeletingAlertId] = useState(null);

  const loadAlertData = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage("");
    setStatusTone("");

    try {
      const response = await fetch(`${API_BASE_URL}/alerts/data?user_id=${userId}`);
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
      setAlerts(
        nextAlerts.slice().sort((left, right) => left.percentage - right.percentage)
      );
      localStorage.setItem("totalBudget", String(nextBudget));
    } catch (error) {
      setStatusMessage(error.message || "Unable to load alerts right now.");
      setStatusTone("error");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setStatusMessage("Please log in again to load alerts.");
      setStatusTone("error");
      return;
    }

    loadAlertData();
  }, [userId, loadAlertData]);

  const spentPercentage = budget > 0 ? (currentSpending / budget) * 100 : 0;
  const remainingAmount = Math.max(budget - currentSpending, 0);

  const closeAddAlertDialog = () => {
    if (isSavingAlert) {
      return;
    }

    setShowAddAlertDialog(false);
    setNewAlertPercentage("");
    setDialogError("");
  };

  const handleSaveBudget = async () => {
    const amount = Number(tempBudget);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatusMessage("Please enter a valid budget amount.");
      setStatusTone("error");
      return;
    }

    setIsSavingBudget(true);
    setStatusMessage("");
    setStatusTone("");

    try {
      const response = await fetch(`${API_BASE_URL}/alerts/budget`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount, user_id: userId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save the budget.");
      }

      setBudget(amount);
      setTempBudget(amount);
      setIsEditingBudget(false);
      setStatusMessage(data.message || "Budget saved successfully.");
      setStatusTone("success");
      localStorage.setItem("totalBudget", String(amount));
    } catch (error) {
      setStatusMessage(error.message || "Unable to save the budget.");
      setStatusTone("error");
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleAddAlert = async () => {
    const percentage = parseInt(newAlertPercentage, 10);

    if (Number.isNaN(percentage)) {
      setDialogError("Please enter a valid number.");
      return;
    }

    if (percentage <= 0) {
      setDialogError("Please enter a value greater than 0.");
      return;
    }

    if (percentage > 100) {
      setDialogError("Please enter a value less than or equal to 100.");
      return;
    }

    setIsSavingAlert(true);
    setDialogError("");

    try {
      const response = await fetch(`${API_BASE_URL}/alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ threshold_percent: percentage, user_id: userId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to add alert.");
      }

      setAlerts((previousAlerts) =>
        [...previousAlerts, { id: data.alert_id, percentage }].sort(
          (left, right) => left.percentage - right.percentage
        )
      );
      setStatusMessage(data.message || "Alert added successfully.");
      setStatusTone("success");
      closeAddAlertDialog();
    } catch (error) {
      setDialogError(error.message || "Unable to add alert.");
    } finally {
      setIsSavingAlert(false);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    setDeletingAlertId(alertId);
    setStatusMessage("");
    setStatusTone("");

    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}?user_id=${userId}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete alert.");
      }

      setAlerts((previousAlerts) =>
        previousAlerts.filter((alert) => alert.id !== alertId)
      );
      setStatusMessage(data.message || "Alert deleted successfully.");
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(error.message || "Unable to delete alert.");
      setStatusTone("error");
    } finally {
      setDeletingAlertId(null);
    }
  };

  return (
    <div className="alertsPage">
      <div className="alertsContent">
        <h1 className="alertsTitle">Alerts</h1>

        {statusMessage && (
          <p
            className={`alertsStatus ${
              statusTone === "error" ? "alertsStatusError" : "alertsStatusSuccess"
            }`}
          >
            {statusMessage}
          </p>
        )}

        <section className="alertsBudgetCard">
          <div className="alertsBudgetEditArea">
            {isEditingBudget ? (
              <div className="alertsBudgetEditActions">
                <button
                  className="alertsSquareButton alertsSquareButtonSave"
                  type="button"
                  onClick={handleSaveBudget}
                  disabled={isSavingBudget}
                  aria-label="Save budget"
                >
                  <Check size={18} />
                </button>
                <button
                  className="alertsSquareButton alertsSquareButtonCancel"
                  type="button"
                  onClick={() => {
                    setTempBudget(budget);
                    setIsEditingBudget(false);
                    setStatusMessage("");
                    setStatusTone("");
                  }}
                  disabled={isSavingBudget}
                  aria-label="Cancel budget edit"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button
                className="alertsSquareButton alertsSquareButtonEdit"
                type="button"
                onClick={() => {
                  setTempBudget(budget);
                  setIsEditingBudget(true);
                  setStatusMessage("");
                  setStatusTone("");
                }}
                aria-label="Edit budget"
              >
                <Edit2 size={18} />
              </button>
            )}
          </div>

          <p className="alertsBudgetLabel">Monthly Budget</p>

          {isEditingBudget ? (
            <input
              className="alertsBudgetInput"
              type="number"
              value={tempBudget}
              onChange={(event) => setTempBudget(event.target.value)}
              autoFocus
            />
          ) : (
            <h2 className="alertsBudgetValue">{formatCurrency(budget)}</h2>
          )}

          <div className="alertsBudgetStats">
            <span>Current Spending: {formatCurrency(currentSpending)}</span>
            <span className="alertsBudgetPercentage">
              {spentPercentage.toFixed(1)}%
            </span>
          </div>

          <div className="alertsProgressTrack">
            <div
              className="alertsProgressFill"
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
          </div>

          <p className="alertsRemainingText">
            Remaining: {formatCurrency(remainingAmount)}
          </p>
        </section>

        <section className="alertsThresholdsCard">
          <div className="alertsThresholdsHeader">
            <h2>Alert Thresholds</h2>
            <button
              className="alertsAddButton"
              type="button"
              onClick={() => {
                setShowAddAlertDialog(true);
                setDialogError("");
                setNewAlertPercentage("");
              }}
            >
              <Plus size={16} />
              <span>Add Alert</span>
            </button>
          </div>

          {isLoading ? (
            <p className="alertsEmptyState">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="alertsEmptyState">
              No alert thresholds yet. Add one to start tracking.
            </p>
          ) : (
            <div className="alertsThresholdsList">
              {alerts.map((alert) => {
                const tone = getAlertTone(alert.percentage);
                const isTriggered = spentPercentage >= alert.percentage;
                const triggerAmount = budget * (alert.percentage / 100);

                return (
                  <div
                    className={`alertsThresholdItem alertsThresholdItem--${tone}`}
                    key={alert.id}
                  >
                    <div className={`alertsThresholdIcon alertsThresholdIcon--${tone}`}>
                      {isTriggered ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                    </div>

                    <div className="alertsThresholdCopy">
                      <div className="alertsThresholdTitleRow">
                        <h3>{alert.percentage}% Alert</h3>
                        {isTriggered && (
                          <span className="alertsTriggeredBadge">Triggered</span>
                        )}
                      </div>
                      <p>
                        Alert when spending reaches {formatCurrency(triggerAmount)}
                      </p>
                    </div>

                    <button
                      className="alertsDeleteButton"
                      type="button"
                      onClick={() => handleDeleteAlert(alert.id)}
                      disabled={deletingAlertId === alert.id}
                      aria-label={`Delete ${alert.percentage}% alert`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showAddAlertDialog && (
        <div className="alertsModalOverlay">
          <div className="alertsModal">
            <h2>Add Alert</h2>
            <p className="alertsModalHint">
              Enter the budget percentage that should trigger this alert.
            </p>

            <input
              className="alertsModalInput"
              type="number"
              placeholder="Alert percentage"
              value={newAlertPercentage}
              onChange={(event) => {
                setNewAlertPercentage(event.target.value);
                setDialogError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleAddAlert();
                }
              }}
              autoFocus
            />

            {dialogError && <p className="alertsDialogError">{dialogError}</p>}

            <div className="alertsModalButtons">
              <button
                className="alertsModalCancel"
                type="button"
                onClick={closeAddAlertDialog}
                disabled={isSavingAlert}
              >
                Cancel
              </button>
              <button
                className="alertsModalSave"
                type="button"
                onClick={handleAddAlert}
                disabled={isSavingAlert}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
