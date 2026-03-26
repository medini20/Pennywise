import React, { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaTimes,
  FaUtensils,
  FaPlus,
  FaCar,
  FaShoppingCart,
  FaHeartbeat
} from "react-icons/fa";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import "./Budget.css";
import Category from "./Category";

const API_BASE_URL = "http://localhost:5001";
const INR = "\u20B9";

const normalizeCategoryName = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const getTransactionIcon = (transaction) => {
  if (typeof transaction?.category_icon === "string" && transaction.category_icon.trim()) {
    return transaction.category_icon.trim();
  }

  if (typeof transaction?.categoryIcon === "string" && transaction.categoryIcon.trim()) {
    return transaction.categoryIcon.trim();
  }

  return "";
};

const inferIconFromText = (value) => {
  const normalizedValue = normalizeCategoryName(value);

  if (!normalizedValue) {
    return "";
  }

  if (
    normalizedValue.includes("finance") ||
    normalizedValue.includes("renovation") ||
    normalizedValue.includes("investment") ||
    normalizedValue.includes("loan") ||
    normalizedValue.includes("rent")
  ) {
    return "\uD83D\uDCB0";
  }

  if (normalizedValue.includes("home")) {
    return "\uD83C\uDFE0";
  }

  if (normalizedValue.includes("food") || normalizedValue.includes("restaurant")) {
    return "\uD83C\uDF7D\uFE0F";
  }

  if (normalizedValue.includes("pet")) {
    return "\uD83D\uDC36";
  }

  if (normalizedValue.includes("electronic")) {
    return "\uD83D\uDCF1";
  }

  return "";
};

const getBudgetAccentColor = (budget) => {
  if (budget?.color && budget.color !== "#ffcc00") {
    return budget.color;
  }

  const iconKey = typeof budget?.icon === "string" ? budget.icon.trim() : "";
  const nameKey = normalizeCategoryName(budget?.name);
  const key = iconKey || nameKey;

  const accentMap = {
    "🏠": "#ff5a52",
    "🛍️": "#f6c90e",
    "❤️": "#3b82f6",
    "💰": "#f59e0b",
    "🍽️": "#06b6d4",
    "🎓": "#20c997",
    "✂️": "#ec4899",
    "🎵": "#8b5cf6",
    "🎮": "#7c3aed",
    "🐶": "#14b8a6",
    "✈️": "#60a5fa",
    "🚗": "#8b5cf6",
    "food": "#06b6d4",
    "home": "#ff5a52",
    "home & rent": "#ff5a52",
    "shopping": "#f6c90e",
    "health": "#3b82f6",
    "finance": "#f59e0b",
    "education": "#20c997",
    "personal care": "#ec4899",
    "donations": "#14b8a6",
    "travel": "#60a5fa",
    "transport": "#8b5cf6"
  };

  return accentMap[key] || "#3b82f6";
};

const formatTransactionDate = (value) => {
  if (!value) {
    return new Date();
  }

  return new Date(value);
};

function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    loadBudgets();
    loadTransactions();
  }, []);

  useEffect(() => {
    if (isDetailOpen && selectedBudget) {
      loadTransactions();
    }
  }, [isDetailOpen, selectedBudget]);

  const computedBudgets = useMemo(() => {
    return budgets.map((budget) => {
      const budgetIcon = typeof budget.icon === "string" ? budget.icon.trim() : "";
      const budgetName = normalizeCategoryName(budget.name);

      const spent = transactions.reduce((sum, transaction) => {
        if (transaction.type !== "expense") {
          return sum;
        }

        const transactionIcon = getTransactionIcon(transaction);
        const matchesByIcon =
          Boolean(budgetIcon) &&
          Boolean(transactionIcon) &&
          budgetIcon === transactionIcon;

        const matchesByName =
          normalizeCategoryName(transaction.category_name) === budgetName ||
          normalizeCategoryName(transaction.category) === budgetName ||
          normalizeCategoryName(transaction.description) === budgetName;

        return matchesByIcon || matchesByName
          ? sum + Number(transaction.amount || 0)
          : sum;
      }, 0);

      return {
        ...budget,
        spent
      };
    });
  }, [budgets, transactions]);

  useEffect(() => {
    if (!selectedBudget) {
      return;
    }

    const refreshedBudget = computedBudgets.find(
      (budget) => budget.budget_id === selectedBudget.budget_id
    );

    if (
      refreshedBudget &&
      (
        refreshedBudget.spent !== selectedBudget.spent ||
        refreshedBudget.amount !== selectedBudget.amount ||
        refreshedBudget.name !== selectedBudget.name ||
        refreshedBudget.icon !== selectedBudget.icon
      )
    ) {
      setSelectedBudget(refreshedBudget);
    }
  }, [computedBudgets, selectedBudget]);

  const loadBudgets = () => {
    fetch(`${API_BASE_URL}/budget/list`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.budgets || [];
        setBudgets(list);
      })
      .catch(() => console.log("Database offline"));
  };

  const loadTransactions = () => {
    fetch(`${API_BASE_URL}/api/transactions?user_id=1`)
      .then((res) => res.json())
      .then((data) => {
        setTransactions(Array.isArray(data) ? data : []);
      })
      .catch(() => setTransactions([]));
  };

  const renderIcon = (iconValue, color) => {
    const style = { color: color || "#20c4d8", fontSize: "20px" };

    switch (iconValue) {
      case "Food":
        return <FaUtensils style={style} />;
      case "Transport":
        return <FaCar style={style} />;
      case "Shopping":
        return <FaShoppingCart style={style} />;
      case "Health":
        return <FaHeartbeat style={style} />;
      default:
        return <span style={{ fontSize: "22px" }}>{iconValue}</span>;
    }
  };

  const openEdit = (budget) => {
    setSelectedBudget(budget);
    setEditName(budget.name || budget.icon || "");
    setAmount(budget.amount);
    setEditOpen(true);
  };

  const openDelete = (budget) => {
    setSelectedBudget(budget);
    setDeleteOpen(true);
  };

  const openBudgetDetails = (budget) => {
    setSelectedBudget(budget);
    setIsDetailOpen(true);
    loadTransactions();
  };

  const closeBudgetDetails = () => {
    setIsDetailOpen(false);
    setSelectedBudget(null);
  };

  const saveBudget = () => {
    fetch(`${API_BASE_URL}/budget/edit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budget_id: selectedBudget.budget_id,
        name: editName,
        amount: Number(amount)
      })
    }).then(() => {
      setEditOpen(false);
      loadBudgets();
    });
  };

  const deleteBudget = () => {
    fetch(`${API_BASE_URL}/budget/${selectedBudget.budget_id}`, {
      method: "DELETE"
    }).then(() => {
      setDeleteOpen(false);
      if (isDetailOpen) {
        closeBudgetDetails();
      }
      loadBudgets();
    });
  };

  const categoryHistory = useMemo(() => {
    if (!selectedBudget) {
      return [];
    }

    const selectedName = normalizeCategoryName(selectedBudget.name);
    const selectedIcon =
      typeof selectedBudget.icon === "string" ? selectedBudget.icon.trim() : "";

    return transactions.filter((transaction) => {
      const transactionIcon =
        typeof transaction.category_icon === "string"
          ? transaction.category_icon.trim()
          : typeof transaction.categoryIcon === "string"
            ? transaction.categoryIcon.trim()
            : "";
      const inferredTransactionIcon =
        transactionIcon ||
        inferIconFromText(transaction.category_name) ||
        inferIconFromText(transaction.description) ||
        inferIconFromText(transaction.category);

      const matchesByIcon =
        Boolean(selectedIcon) &&
        Boolean(inferredTransactionIcon) &&
        inferredTransactionIcon === selectedIcon;

      const matchesByName =
        normalizeCategoryName(transaction.category_name) === selectedName ||
        normalizeCategoryName(transaction.description) === selectedName ||
        normalizeCategoryName(transaction.category) === selectedName;

      return transaction.type === "expense" && (matchesByIcon || matchesByName);
    });
  }, [selectedBudget, transactions]);

  if (isDetailOpen && selectedBudget) {
    const spent = Number(selectedBudget.spent || 0);
    const budgetAmount = Number(selectedBudget.amount || 0);
    const remaining = Math.max(budgetAmount - spent, 0);
    const percent = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
    const accentColor = getBudgetAccentColor(selectedBudget);

    return (
      <div className="budget-container budget-detail-container">
        <div className="budget-detail-topbar">
          <div className="budget-detail-left">
            <button className="detail-icon-btn" onClick={closeBudgetDetails}>
              <FaArrowLeft />
            </button>
            <div
              className="detail-category-icon"
              style={{
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}55`
              }}
            >
              {renderIcon(selectedBudget.icon || selectedBudget.name, accentColor)}
            </div>
            <div className="detail-budget-meta">
              <h2>{selectedBudget.name}</h2>
              <span>Budget: {INR}{budgetAmount} | Spent: {INR}{spent}</span>
            </div>
          </div>

          <div className="budget-detail-actions">
            <button className="detail-icon-btn action-edit-btn" onClick={() => openEdit(selectedBudget)}>
              <LuPencil />
            </button>
            <button className="detail-icon-btn danger action-delete-btn" onClick={() => openDelete(selectedBudget)}>
              <LuTrash2 />
            </button>
          </div>
        </div>

        <div className="budget-summary-card">
          <div className="budget-summary-head">
            <div>
              <span className="summary-label">Remaining Budget</span>
              <h3>{INR}{remaining}</h3>
            </div>
            <div className="summary-total">
              <span className="summary-label">Total Budget</span>
              <h3>{INR}{budgetAmount}</h3>
            </div>
          </div>

          <div className="detail-progress-track">
            <div
              className="detail-progress-fill"
              style={{ width: `${percent}%`, background: accentColor }}
            />
          </div>

          <div className="detail-progress-meta">
            <span>{INR}{spent} spent</span>
            <span>{Math.round(percent)}%</span>
          </div>
        </div>

        <div className="budget-history-card">
          <h3>Expense History</h3>

          {categoryHistory.length === 0 ? (
            <p className="history-empty">No transactions yet for this category.</p>
          ) : (
            <div className="history-list">
              {categoryHistory.map((transaction) => {
                const transactionDate = formatTransactionDate(transaction.transaction_date);

                return (
                  <div className="history-item" key={transaction.transaction_id}>
                    <div className="history-date-block">
                      <div className="history-date">
                        {transactionDate.toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short"
                        })}
                      </div>
                      <div className="history-day">
                        {transactionDate.toLocaleDateString("en-IN", {
                          weekday: "long"
                        })}
                      </div>
                    </div>

                    <div
                      className="history-icon"
                      style={{
                        background: `${accentColor}18`,
                        border: `1px solid ${accentColor}55`
                      }}
                    >
                      {renderIcon(selectedBudget.icon || selectedBudget.name, accentColor)}
                    </div>

                    <div className="history-description">
                      {transaction.description || "No description"}
                    </div>

                    <div className="history-amount">
                      -{INR}{Number(transaction.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {editOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Edit Budget</h2>
                <FaTimes className="close-icon" onClick={() => setEditOpen(false)} />
              </div>

              <div className="category-header-box">
                <div
                  className="ch-icon"
                  style={{ background: `${selectedBudget?.color || "#20c4d8"}20` }}
                >
                  {renderIcon(selectedBudget?.icon, selectedBudget?.color || "#20c4d8")}
                </div>
                <div className="ch-details">
                  <h4>{selectedBudget?.name}</h4>
                  <span>Current: {INR}{selectedBudget?.amount}</span>
                </div>
              </div>

              <div className="input-group">
                <label>Category Name</label>
                <input
                  className="styled-input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Monthly Budget ({INR})</label>
                <input
                  className="styled-input"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="modal-buttons">
                <button className="btn-cancel" onClick={() => setEditOpen(false)}>Cancel</button>
                <button className="btn-save" onClick={saveBudget}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {deleteOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Delete Category</h2>
                <FaTimes className="close-icon" onClick={() => setDeleteOpen(false)} />
              </div>

              <div className="warning-box">
                <p className="delete-main">
                  Are you sure you want to delete <b>{selectedBudget?.name}</b>?
                </p>
                <p className="delete-sub">
                  This action cannot be undone. All transactions in this category will be permanently deleted.
                </p>
              </div>

              <div className="modal-buttons">
                <button className="btn-cancel" onClick={() => setDeleteOpen(false)}>Cancel</button>
                <button className="btn-confirm" onClick={deleteBudget}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="budget-container">
      <h2 className="budget-title">Budget Categories</h2>

      <div className="budget-list">
        {computedBudgets.length > 0 ? (
          computedBudgets.map((budget) => {
            const spent = Number(budget.spent || 0);
            const budgetAmount = Number(budget.amount || 0);
            const remaining = budgetAmount - spent;
            const percent = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
            const accentColor = getBudgetAccentColor(budget);

            return (
              <div
                className="budget-card"
                key={budget.budget_id}
                onClick={() => openBudgetDetails(budget)}
              >
                <div
                  className="icon-wrapper"
                  style={{ background: `${accentColor}15` }}
                >
                  {renderIcon(budget.icon || "Food", accentColor)}
                </div>

                <div className="card-content">
                  <div className="cat-name">{budget.name || budget.icon}</div>

                  <div className="progress-row">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: accentColor,
                          boxShadow: `0 0 10px ${accentColor}60`
                        }}
                      />
                    </div>
                    <div className="card-actions">
                      <LuPencil
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(budget);
                        }}
                        className="action-btn edit"
                      />
                      <LuTrash2
                        onClick={(event) => {
                          event.stopPropagation();
                          openDelete(budget);
                        }}
                        className="action-btn delete"
                      />
                    </div>
                  </div>

                  <div className="stats-row">
                    <span>Spent: <span className="val">{INR}{spent}</span></span>
                    <span>Budget: <span className="val">{INR}{budgetAmount}</span></span>
                    <span className="remaining-val" style={{ color: "#10b981" }}>
                      Remaining: {INR}{remaining}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="empty-msg">No budgets found. Add one to start tracking!</p>
        )}

        <div className="add-card-dashed" onClick={() => setIsCategoryModalOpen(true)}>
          <div className="plus-icon-container"><FaPlus /></div>
          <span>Add Budget</span>
        </div>
      </div>

      {isCategoryModalOpen && (
        <Category
          closeCategory={() => setIsCategoryModalOpen(false)}
          addNewCategory={loadBudgets}
        />
      )}

      {editOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Budget</h2>
              <FaTimes className="close-icon" onClick={() => setEditOpen(false)} />
            </div>

            <div className="category-header-box">
              <div
                className="ch-icon"
                style={{ background: `${selectedBudget?.color || "#20c4d8"}20` }}
              >
                {renderIcon(selectedBudget?.icon, selectedBudget?.color || "#20c4d8")}
              </div>
              <div className="ch-details">
                <h4>{selectedBudget?.name}</h4>
                <span>Current: {INR}{selectedBudget?.amount}</span>
              </div>
            </div>

            <div className="input-group">
              <label>Category Name</label>
              <input
                className="styled-input"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Monthly Budget ({INR})</label>
              <input
                className="styled-input"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="btn-save" onClick={saveBudget}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Delete Category</h2>
              <FaTimes className="close-icon" onClick={() => setDeleteOpen(false)} />
            </div>

            <div className="warning-box">
              <p className="delete-main">
                Are you sure you want to delete <b>{selectedBudget?.name}</b>?
              </p>
              <p className="delete-sub">
                This action cannot be undone. All transactions in this category will be permanently deleted.
              </p>
            </div>

            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button className="btn-confirm" onClick={deleteBudget}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Budget;
