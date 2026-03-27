import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle,
  Edit2,
  Plus,
  Trash2,
  X
} from "lucide-react";
import AestheticDatePicker from "../components/AestheticDatePicker";
import { getStoredUser } from "../services/authStorage";
import {
  formatDateRange,
  getCurrentMonthDateRange,
  withDefaultBudgetDateRange
} from "../utils/budgetDates";
import "./Alerts.css";

const API_BASE_URL = "http://localhost:5001";
const INR_SYMBOL = "\u20B9";
const DEFAULT_BUDGET_COLOR = "#ffcc00";

const formatCurrency = (value) =>
  `${INR_SYMBOL}${Number(value || 0).toLocaleString("en-IN")}`;

const normalizeCategoryName = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const getAlertTone = (percentage) => {
  if (percentage <= 60) {
    return "safe";
  }

  if (percentage <= 85) {
    return "warning";
  }

  return "danger";
};

const getCategoryAlertAccent = (alert) => {
  if (alert?.budget_color && alert.budget_color !== DEFAULT_BUDGET_COLOR) {
    return alert.budget_color;
  }

  const iconKey = typeof alert?.budget_icon === "string" ? alert.budget_icon.trim() : "";
  const nameKey = normalizeCategoryName(alert?.budget_name);
  const key = iconKey || nameKey;

  const accentMap = {
    "\uD83C\uDFE0": "#ff5a52",
    "\uD83D\uDED2": "#f6c90e",
    "\u2764\uFE0F": "#ef4444",
    "\uD83D\uDCB0": "#f59e0b",
    "\uD83C\uDF7D\uFE0F": "#06b6d4",
    "\uD83D\uDE97": "#8b5cf6",
    "\uD83C\uDF93": "#20c997",
    "\u26A1": "#f59e0b",
    food: "#06b6d4",
    shopping: "#f6c90e",
    health: "#ef4444",
    finance: "#f59e0b",
    transport: "#8b5cf6",
    transportation: "#8b5cf6",
    utilities: "#f59e0b",
    home: "#ff5a52",
    housing: "#22c55e",
    education: "#20c997"
  };

  return accentMap[key] || "#8b5cf6";
};

const getAlertDescription = (alert, triggerAmount) => {
  if (alert.scope === "category") {
    return `Alert when ${alert.budget_name} spending reaches ${formatCurrency(triggerAmount)}`;
  }

  return `Alert when spending reaches ${formatCurrency(triggerAmount)}`;
};

const toBudgetIdValue = (value) => String(value ?? "");

const notifyAlertStateChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pennywise-alerts-updated"));
  }
};

export default function AlertsView() {
  const storedUser = getStoredUser();
  const userId = storedUser?.id ?? storedUser?.user_id ?? 1;
  const defaultMonthRange = getCurrentMonthDateRange();
  const [budget, setBudget] = useState(5000);
  const [budgetId, setBudgetId] = useState(null);
  const [budgetStartDate, setBudgetStartDate] = useState(defaultMonthRange.startDate);
  const [budgetEndDate, setBudgetEndDate] = useState(defaultMonthRange.endDate);
  const [tempBudget, setTempBudget] = useState(5000);
  const [tempBudgetStartDate, setTempBudgetStartDate] = useState(defaultMonthRange.startDate);
  const [tempBudgetEndDate, setTempBudgetEndDate] = useState(defaultMonthRange.endDate);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [currentSpending, setCurrentSpending] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [categoryBudgets, setCategoryBudgets] = useState([]);
  const [showAddAlertDialog, setShowAddAlertDialog] = useState(false);
  const [newAlertPercentage, setNewAlertPercentage] = useState("");
  const [isCategorySpecificAlert, setIsCategorySpecificAlert] = useState(false);
  const [selectedCategoryBudgetId, setSelectedCategoryBudgetId] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [isSavingAlert, setIsSavingAlert] = useState(false);
  const [deletingAlertId, setDeletingAlertId] = useState(null);

  const loadAlertData = useCallback(async ({ clearStatus = true } = {}) => {
    setIsLoading(true);

    if (clearStatus) {
      setStatusMessage("");
      setStatusTone("");
    }

    try {
      const [alertsResponse, budgetsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/alerts/data?user_id=${userId}`),
        fetch(`${API_BASE_URL}/budget/list?user_id=${userId}`).catch(() => null)
      ]);
      const data = await alertsResponse.json();
      const budgetsData = budgetsResponse
        ? await budgetsResponse.json().catch(() => [])
        : [];

      if (!alertsResponse.ok) {
        throw new Error(data.error || "Unable to load alerts right now.");
      }

      const nextBudget = Number(data.budget) || 5000;
      const nextBudgetId = Number(data.budget_id) || null;
      const nextStartDate =
        typeof data.start_date === "string" && data.start_date
          ? data.start_date
          : defaultMonthRange.startDate;
      const nextEndDate =
        typeof data.end_date === "string" && data.end_date
          ? data.end_date
          : defaultMonthRange.endDate;
      const nextAlerts = (Array.isArray(data.alerts) ? data.alerts : []).map((alert) =>
        withDefaultBudgetDateRange(alert)
      );
      const fallbackBudgetList = (
        Array.isArray(budgetsData) ? budgetsData : budgetsData.budgets || []
      ).map((budgetItem) => withDefaultBudgetDateRange(budgetItem));
      const categoryBudgetSource = Array.isArray(data.available_category_budgets) &&
        data.available_category_budgets.length > 0
        ? data.available_category_budgets
        : fallbackBudgetList;
      const nextCategoryBudgets = categoryBudgetSource.map((budgetItem) =>
        withDefaultBudgetDateRange(budgetItem)
      );

      setBudget(nextBudget);
      setBudgetId(nextBudgetId);
      setBudgetStartDate(nextStartDate);
      setBudgetEndDate(nextEndDate);
      setTempBudget(nextBudget);
      setTempBudgetStartDate(nextStartDate);
      setTempBudgetEndDate(nextEndDate);
      setCurrentSpending(Number(data.current_spending) || 0);
      setAlerts(nextAlerts);
      setCategoryBudgets(nextCategoryBudgets);
      localStorage.setItem("totalBudget", String(nextBudget));
    } catch (error) {
      setStatusMessage(error.message || "Unable to load alerts right now.");
      setStatusTone("error");
    } finally {
      setIsLoading(false);
    }
  }, [defaultMonthRange.endDate, defaultMonthRange.startDate, userId]);

  useEffect(() => {
    loadAlertData();
  }, [loadAlertData]);

  useEffect(() => {
    if (!showAddAlertDialog || !isCategorySpecificAlert) {
      return;
    }

    const selectedBudgetStillExists = categoryBudgets.some(
      (budgetItem) => toBudgetIdValue(budgetItem.budget_id) === selectedCategoryBudgetId
    );

    if (!selectedBudgetStillExists) {
      setSelectedCategoryBudgetId(
        categoryBudgets.length > 0 ? toBudgetIdValue(categoryBudgets[0].budget_id) : ""
      );
    }
  }, [
    categoryBudgets,
    isCategorySpecificAlert,
    selectedCategoryBudgetId,
    showAddAlertDialog
  ]);

  const spentPercentage = budget > 0 ? (currentSpending / budget) * 100 : 0;
  const remainingAmount = Math.max(budget - currentSpending, 0);

  const resetAddAlertDialog = () => {
    setShowAddAlertDialog(false);
    setNewAlertPercentage("");
    setIsCategorySpecificAlert(false);
    setSelectedCategoryBudgetId("");
    setDialogError("");
  };

  const closeAddAlertDialog = () => {
    if (isSavingAlert) {
      return;
    }

    resetAddAlertDialog();
  };

  const handleOpenAddAlertDialog = () => {
    setShowAddAlertDialog(true);
    setNewAlertPercentage("");
    setIsCategorySpecificAlert(false);
    setSelectedCategoryBudgetId(
      categoryBudgets.length > 0 ? toBudgetIdValue(categoryBudgets[0].budget_id) : ""
    );
    setDialogError("");
  };

  const handleStartBudgetEdit = () => {
    setTempBudget(budget);
    setTempBudgetStartDate(budgetStartDate);
    setTempBudgetEndDate(budgetEndDate);
    setIsEditingBudget(true);
    setStatusMessage("");
    setStatusTone("");
  };

  const handleCancelBudgetEdit = () => {
    setTempBudget(budget);
    setTempBudgetStartDate(budgetStartDate);
    setTempBudgetEndDate(budgetEndDate);
    setIsEditingBudget(false);
    setStatusMessage("");
    setStatusTone("");
  };

  const handleBudgetStartDateChange = (nextStartDate) => {
    setTempBudgetStartDate(nextStartDate);

    if (tempBudgetEndDate && nextStartDate && nextStartDate > tempBudgetEndDate) {
      setTempBudgetEndDate(nextStartDate);
    }
  };

  const handleBudgetEndDateChange = (nextEndDate) => {
    setTempBudgetEndDate(nextEndDate);

    if (tempBudgetStartDate && nextEndDate && nextEndDate < tempBudgetStartDate) {
      setTempBudgetStartDate(nextEndDate);
    }
  };

  const handleSaveBudget = async () => {
    const amount = Number(tempBudget);

    if (!Number.isFinite(amount) || amount <= 0) {
      setStatusMessage("Please enter a valid budget amount.");
      setStatusTone("error");
      return;
    }

    if (!tempBudgetStartDate || !tempBudgetEndDate) {
      setStatusMessage("Please choose both a start date and an end date.");
      setStatusTone("error");
      return;
    }

    if (tempBudgetStartDate > tempBudgetEndDate) {
      setStatusMessage("Start date must be on or before end date.");
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
        body: JSON.stringify({
          amount,
          user_id: userId,
          budget_id: budgetId,
          start_date: tempBudgetStartDate,
          end_date: tempBudgetEndDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save the budget.");
      }

      await loadAlertData({ clearStatus: false });
      setIsEditingBudget(false);
      setStatusMessage(data.message || "Budget saved successfully.");
      setStatusTone("success");
      localStorage.setItem("totalBudget", String(amount));
      notifyAlertStateChanged();
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

    if (isCategorySpecificAlert && !selectedCategoryBudgetId) {
      setDialogError("Please choose a budget category first.");
      return;
    }

    setIsSavingAlert(true);
    setDialogError("");
    let didSave = false;

    try {
      const payload = {
        threshold_percent: percentage,
        scope: isCategorySpecificAlert ? "category" : "overall",
        user_id: userId
      };

      if (isCategorySpecificAlert) {
        payload.budget_id = Number(selectedCategoryBudgetId);
      }

      const response = await fetch(`${API_BASE_URL}/alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to add alert.");
      }

      await loadAlertData({ clearStatus: false });
      setStatusMessage(data.message || "Alert added successfully.");
      setStatusTone("success");
      notifyAlertStateChanged();
      didSave = true;
    } catch (error) {
      await loadAlertData({ clearStatus: false });
      setDialogError(error.message || "Unable to add alert.");
    } finally {
      setIsSavingAlert(false);

      if (didSave) {
        resetAddAlertDialog();
      }
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

      await loadAlertData({ clearStatus: false });
      setStatusMessage(data.message || "Alert deleted successfully.");
      setStatusTone("success");
      notifyAlertStateChanged();
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
                  onClick={handleCancelBudgetEdit}
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
                onClick={handleStartBudgetEdit}
                aria-label="Edit budget"
              >
                <Edit2 size={18} />
              </button>
            )}
          </div>

          <p className="alertsBudgetLabel">Monthly Budget</p>

          {isEditingBudget ? (
            <div className="alertsBudgetForm">
              <div className="alertsBudgetField">
                <label className="alertsBudgetFieldLabel" htmlFor="alerts-budget-amount">
                  Monthly Budget ({INR_SYMBOL})
                </label>
                <input
                  id="alerts-budget-amount"
                  className="alertsBudgetInput"
                  type="number"
                  value={tempBudget}
                  onChange={(event) => setTempBudget(event.target.value)}
                  autoFocus
                />
              </div>

              <div className="alertsBudgetDateGrid">
                <label className="alertsBudgetDateField">
                  <span>Start Date</span>
                  <AestheticDatePicker
                    value={tempBudgetStartDate}
                    onChange={handleBudgetStartDateChange}
                  />
                </label>

                <label className="alertsBudgetDateField">
                  <span>End Date</span>
                  <AestheticDatePicker
                    value={tempBudgetEndDate}
                    onChange={handleBudgetEndDateChange}
                    align="right"
                  />
                </label>
              </div>
            </div>
          ) : (
            <>
              <h2 className="alertsBudgetValue">{formatCurrency(budget)}</h2>
              <div className="alertsBudgetPeriod">
                <CalendarDays size={16} />
                <span>{formatDateRange(budgetStartDate, budgetEndDate)}</span>
              </div>
            </>
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
              onClick={handleOpenAddAlertDialog}
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
                const isCategoryAlert = alert.scope === "category";
                const tone = isCategoryAlert ? "category" : getAlertTone(alert.percentage);
                const isTriggered = Boolean(alert.triggered);
                const triggerAmount =
                  Number(alert.threshold_amount || 0) ||
                  Number(alert.budget_amount || 0) * (alert.percentage / 100) ||
                  (alert.scope === "overall" ? Number(budget || 0) * (alert.percentage / 100) : 0);
                const categoryAccent = isCategoryAlert
                  ? getCategoryAlertAccent(alert)
                  : null;

                return (
                  <div
                    className={`alertsThresholdItem alertsThresholdItem--${tone}`}
                    key={alert.id}
                    style={
                      isCategoryAlert
                        ? {
                            borderColor: `${categoryAccent}44`,
                            boxShadow: `inset 0 1px 0 ${categoryAccent}10`
                          }
                        : undefined
                    }
                  >
                    {isCategoryAlert ? (
                      <div
                        className="alertsThresholdIcon alertsThresholdIcon--category"
                        style={{
                          background: `${categoryAccent}22`,
                          borderColor: `${categoryAccent}44`,
                          color: categoryAccent
                        }}
                      >
                        <span className="alertsThresholdCategoryIconValue">
                          {alert.budget_icon || alert.budget_name?.slice(0, 1) || "C"}
                        </span>
                      </div>
                    ) : (
                      <div className={`alertsThresholdIcon alertsThresholdIcon--${tone}`}>
                        {isTriggered ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                      </div>
                    )}

                    <div className="alertsThresholdCopy">
                      <div className="alertsThresholdTitleRow">
                        {isCategoryAlert ? (
                          <h3 className="alertsThresholdCategoryTitle">
                            <span>{alert.percentage}% Alert</span>
                            <span className="alertsThresholdCategoryDivider">•</span>
                            <span className="alertsThresholdCategoryName">
                              {alert.budget_name}
                            </span>
                          </h3>
                        ) : (
                          <h3>{alert.percentage}% Alert</h3>
                        )}

                        {isTriggered && !isCategoryAlert && (
                          <span className="alertsTriggeredBadge">Triggered</span>
                        )}
                      </div>

                      <p>{getAlertDescription(alert, triggerAmount)}</p>

                      {!isCategoryAlert && (
                        <span className="alertsThresholdMeta">
                          {formatDateRange(alert.start_date, alert.end_date)}
                        </span>
                      )}
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
          <div className={`alertsModal ${isCategorySpecificAlert ? "alertsModalWide" : ""}`}>
            <div className="alertsModalHeader">
              <h2>Add Alert</h2>
              <button
                className="alertsModalClose"
                type="button"
                onClick={closeAddAlertDialog}
                disabled={isSavingAlert}
                aria-label="Close add alert dialog"
              >
                <X size={20} />
              </button>
            </div>

            <p className="alertsModalHint">
              Get notified when your spending reaches a certain percentage of your budget.
            </p>

            <div
              className={`alertsToggleCard ${
                isCategorySpecificAlert ? "alertsToggleCardActive" : ""
              }`}
            >
              <div className="alertsToggleCopy">
                <strong>Category-Specific Alert</strong>
                <span>Choose from budget categories you already created.</span>
              </div>

              <button
                type="button"
                className={`alertsToggleSwitch ${
                  isCategorySpecificAlert ? "alertsToggleSwitchActive" : ""
                }`}
                onClick={() => {
                  const nextValue = !isCategorySpecificAlert;
                  setIsCategorySpecificAlert(nextValue);
                  setDialogError("");

                  if (nextValue && categoryBudgets.length > 0 && !selectedCategoryBudgetId) {
                    setSelectedCategoryBudgetId(toBudgetIdValue(categoryBudgets[0].budget_id));
                  }
                }}
                aria-pressed={isCategorySpecificAlert}
                aria-label="Toggle category-specific alert"
              >
                <span />
              </button>
            </div>

            {isCategorySpecificAlert && (
              <div className="alertsCategorySection">
                <p className="alertsModalSectionLabel">Select Category</p>

                {categoryBudgets.length === 0 ? (
                  <div className="alertsCategoryEmpty">
                    Add a budget category first, then you can create category-wise alerts here.
                  </div>
                ) : (
                  <div className="alertsCategoryGrid">
                    {categoryBudgets.map((categoryBudget) => {
                      const budgetValue = toBudgetIdValue(categoryBudget.budget_id);
                      const isSelected = selectedCategoryBudgetId === budgetValue;

                      return (
                        <button
                          key={categoryBudget.budget_id}
                          type="button"
                          className={`alertsCategoryOption ${
                            isSelected ? "alertsCategoryOptionSelected" : ""
                          }`}
                          onClick={() => {
                            setSelectedCategoryBudgetId(budgetValue);
                            setDialogError("");
                          }}
                        >
                          <span
                            className="alertsCategoryOptionIcon"
                            style={{
                              background: `${categoryBudget.color || "#3b82f6"}22`,
                              borderColor: `${categoryBudget.color || "#3b82f6"}66`,
                              color: categoryBudget.color || "#60a5fa"
                            }}
                          >
                            {categoryBudget.icon || categoryBudget.name?.slice(0, 1) || "B"}
                          </span>

                          <span className="alertsCategoryOptionCopy">
                            <strong>{categoryBudget.name}</strong>
                            <span>
                              {formatCurrency(categoryBudget.amount)} ·{" "}
                              {formatDateRange(categoryBudget.start_date, categoryBudget.end_date, {
                                day: "numeric",
                                month: "short"
                              })}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="alertsModalField">
              <label htmlFor="alerts-alert-percentage">Alert Percentage (%)</label>
              <input
                id="alerts-alert-percentage"
                className="alertsModalInput"
                type="number"
                placeholder="e.g., 50, 75, 90"
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
                autoFocus={!isEditingBudget}
              />
            </div>

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
                disabled={
                  isSavingAlert ||
                  (isCategorySpecificAlert && categoryBudgets.length === 0)
                }
              >
                Add Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
