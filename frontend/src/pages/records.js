import React, { useEffect, useState } from "react";
import { FaPen, FaTrash } from "react-icons/fa";
import Transactions from "./Transactions";
import Notifications from "../components/Notifications";
import { getStoredUser } from "../services/authStorage";
import "./records.css";

const API_BASE_URL = "http://localhost:5001";
const INR = "\u20B9";
const MONTH_OPTIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const CATEGORY_ICON_MAP = {
  food: "\uD83C\uDF7D\uFE0F",
  "food & dining": "\uD83C\uDF7D\uFE0F",
  home: "\uD83C\uDFE0",
  electronics: "\uD83D\uDCF1",
  pet: "\uD83D\uDC36",
  pets: "\uD83D\uDC36",
  shopping: "\uD83D\uDED2",
  clothing: "\uD83D\uDED2",
  car: "\uD83D\uDE97",
  transport: "\uD83D\uDE97",
  health: "\u2764\uFE0F",
  fitness: "\uD83C\uDFCB\uFE0F",
  games: "\uD83C\uDFAE",
  music: "\uD83C\uDFB5",
  finance: "\uD83D\uDCB0",
  bonus: "\uD83D\uDCC8",
  salary: "\uD83D\uDCB5",
  freelance: "\uD83D\uDCBC",
  investment: "\uD83D\uDC37"
};

const formatTransactionDate = (transaction) => {
  if (transaction.transaction_date) {
    return new Date(transaction.transaction_date);
  }

  if (transaction.transactionDate) {
    return new Date(`${transaction.transactionDate}T00:00:00`);
  }

  return new Date();
};

const getTransactionTime = (transaction) => {
  const rawValue = transaction.created_at || transaction.createdAt || "";

  if (typeof rawValue !== "string") {
    return "";
  }

  const timeMatch = rawValue.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);

  if (!timeMatch) {
    return "";
  }

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || 0);

  if (hour === 0 && minute === 0 && second === 0) {
    return "";
  }

  const transactionDate = new Date(rawValue);

  return transactionDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

const getTransactionIcon = (transaction) => {
  if (typeof transaction.categoryIcon === "string" && transaction.categoryIcon.trim()) {
    return transaction.categoryIcon.trim();
  }

  if (typeof transaction.category_icon === "string" && transaction.category_icon.trim()) {
    return transaction.category_icon.trim();
  }

  const fallbackKey = (
    transaction.category_name ||
    transaction.category ||
    transaction.description ||
    ""
  )
    .trim()
    .toLowerCase();

  return CATEGORY_ICON_MAP[fallbackKey] || "\uD83D\uDCB0";
};

const getTransactionId = (transaction) =>
  transaction.transaction_id || transaction.transactionId || null;

const isRecurringTransaction = (transaction) =>
  Boolean(transaction.recurring_payment_id || transaction.recurringPaymentId);

const getRequestErrorMessage = (error) =>
  error.message === "Failed to fetch"
    ? "Backend is offline. Start the server on port 5001 and try again."
    : error.message;

export default function Records({ notifications = [], dismissNotification, onSpendingChange }) {
  const currentDate = new Date();
  const storedUser = getStoredUser();
  const userId = storedUser?.id ?? storedUser?.user_id ?? null;
  const [showTransaction, setShowTransaction] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(currentDate.getMonth());
  const [activeTransactionId, setActiveTransactionId] = useState(null);
  const [confirmDeleteTransactionId, setConfirmDeleteTransactionId] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [requestError, setRequestError] = useState("");
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      setRequestError("Please log in again to load your transactions.");
      return;
    }

    fetch(`${API_BASE_URL}/api/transactions?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => setTransactions([]));
  }, [userId]);

  const monthTransactions = transactions.filter((transaction) => {
    const transactionDate = formatTransactionDate(transaction);

    return (
      transactionDate.getMonth() === selectedMonthIndex &&
      transactionDate.getFullYear() === currentYear
    );
  });

  const totalExpense = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const totalIncome = monthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const balance = totalIncome - totalExpense;

  useEffect(() => {
    localStorage.setItem("currentSpending", totalExpense.toString());
    onSpendingChange?.(totalExpense);
  }, [onSpendingChange, totalExpense]);

  const visibleTransactions = monthTransactions.filter((transaction) =>
    filter === "all" ? true : transaction.type === filter
  );

  const closeTransactionModal = () => {
    setShowTransaction(false);
    setEditingTransaction(null);
    setConfirmDeleteTransactionId(null);
  };

  const handleCreateTransaction = async (data) => {
    try {
      setRequestError("");

      const response = await fetch(`${API_BASE_URL}/api/transactions/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          amount: data.amount,
          type: data.type,
          category: data.category,
          categoryIcon: data.categoryIcon,
          description: data.note,
          transaction_date: data.transactionDate,
          recurring: data.recurring,
          recurringFrequency: data.recurringFrequency,
          recurringStartDate: data.recurringStartDate,
          recurringEndDate: data.recurringEndDate,
          customIntervalDays: data.customIntervalDays
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Unable to save transaction.");
      }

      setTransactions((prevTransactions) => [
        {
          transaction_id: result.transaction_id || `local-${Date.now()}`,
          transaction_date: data.recurring ? data.recurringStartDate : data.transactionDate,
          created_at: result.created_at || new Date().toISOString(),
          recurring_payment_id: result.recurring_payment_id || null,
          category_name: data.category,
          category_icon: data.categoryIcon,
          description: data.note || data.category,
          amount: data.amount,
          type: data.type
        },
        ...prevTransactions
      ]);

      return true;
    } catch (error) {
      setRequestError(getRequestErrorMessage(error));
      return false;
    }
  };

  const handleUpdateTransaction = async (data) => {
    const transactionId = getTransactionId(editingTransaction);

    if (!transactionId) {
      return false;
    }

    try {
      setRequestError("");

      const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          amount: data.amount,
          type: data.type,
          category: data.category,
          categoryIcon: data.categoryIcon,
          description: data.note,
          transaction_date: data.transactionDate
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Unable to update transaction.");
      }

      setTransactions((prevTransactions) =>
        prevTransactions.map((transaction) =>
          String(getTransactionId(transaction)) === String(transactionId)
            ? {
                ...transaction,
                transaction_date: data.transactionDate,
                category_name: data.category,
                category_icon: data.categoryIcon || transaction.category_icon || "",
                description: data.note || data.category,
                amount: data.amount,
                type: data.type
              }
            : transaction
        )
      );
      setActiveTransactionId(null);

      return true;
    } catch (error) {
      setRequestError(getRequestErrorMessage(error));
      return false;
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!transactionId) {
      return;
    }

    try {
      setRequestError("");

      const response = await fetch(
        `${API_BASE_URL}/api/transactions/${transactionId}?user_id=${userId}`,
        {
          method: "DELETE"
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete transaction.");
      }

      setTransactions((prevTransactions) =>
        prevTransactions.filter(
          (existingTransaction) =>
            String(getTransactionId(existingTransaction)) !== String(transactionId)
        )
      );
      setActiveTransactionId(null);
      setConfirmDeleteTransactionId(null);
    } catch (error) {
      setRequestError(getRequestErrorMessage(error));
    }
  };

  return (
    <div className="records-page">
      <Notifications
        notifications={notifications}
        removeNotification={dismissNotification || (() => {})}
      />

      {requestError && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "10px",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "#fecaca"
          }}
        >
          {requestError}
        </div>
      )}

      <div className="cards">
        <div className="card expenseCard" onClick={() => setFilter("expense")}>
          <div className="cardTitle">
            <span className="icon expenseIcon">↘</span>
            <span>Expenses</span>
          </div>
          <h2>{INR}{totalExpense}</h2>
        </div>

        <div className="card incomeCard" onClick={() => setFilter("income")}>
          <div className="cardTitle">
            <span className="icon incomeIcon">↗</span>
            <span>Income</span>
          </div>
          <h2>{INR}{totalIncome}</h2>
        </div>

        <div className="card balanceCard" onClick={() => setFilter("all")}>
          <div className="cardTitle">
            <span className="icon balanceIcon">◎</span>
            <span>Balance</span>
          </div>
          <h2>{INR}{balance}</h2>
        </div>
      </div>

      <select
        className="monthDropdown"
        value={selectedMonthIndex}
        onChange={(event) => setSelectedMonthIndex(Number(event.target.value))}
      >
        {MONTH_OPTIONS.map((month, index) => (
          <option key={month} value={index}>
            {month} {currentYear}
          </option>
        ))}
      </select>

      <div className="tableHeader">
        <span>Date</span>
        <span>Description</span>
        <span></span>
      </div>

      <div className="transactions">
        {transactions.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "20px", color: "#9ca3af" }}>
            No transactions yet
          </div>
        )}

        {transactions.length > 0 && visibleTransactions.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "20px", color: "#9ca3af" }}>
            No transactions found for {MONTH_OPTIONS[selectedMonthIndex]} {currentYear}
          </div>
        )}

        {visibleTransactions.map((transaction, index) => {
          const transactionDate = formatTransactionDate(transaction);
          const transactionTime = getTransactionTime(transaction);
          const transactionIcon = getTransactionIcon(transaction);
          const description = transaction.note || transaction.description || "No description";
          const transactionId = getTransactionId(transaction) || index;
          const isTransactionActive = String(activeTransactionId) === String(transactionId);
          const isDeletePromptOpen =
            String(confirmDeleteTransactionId) === String(transactionId);
          const recurringTransaction = isRecurringTransaction(transaction);

          return (
            <div
              className={`transaction ${isTransactionActive ? "transactionActive" : ""} ${isDeletePromptOpen ? "transactionDeletePromptOpen" : ""}`}
              key={transactionId}
              onClick={() => {
                setActiveTransactionId(isTransactionActive ? null : transactionId);
                setConfirmDeleteTransactionId(null);
              }}
            >
              {isTransactionActive && (
                <div className="transactionActions" onClick={(event) => event.stopPropagation()}>
                  <button
                    className="transactionActionButton"
                    type="button"
                    title="Edit"
                    onClick={() => {
                      setConfirmDeleteTransactionId(null);
                      setEditingTransaction(transaction);
                      setShowTransaction(true);
                      setActiveTransactionId(null);
                    }}
                  >
                    <FaPen />
                  </button>

                  <button
                    className="transactionActionButton transactionDeleteButton"
                    type="button"
                    title="Delete"
                    onClick={() =>
                      setConfirmDeleteTransactionId((currentTransactionId) =>
                        String(currentTransactionId) === String(transactionId) ? null : transactionId
                      )
                    }
                  >
                    <FaTrash />
                  </button>
                </div>
              )}

              {isDeletePromptOpen && (
                <div
                  className="transactionDeletePrompt"
                  onClick={(event) => event.stopPropagation()}
                >
                  <span>Do you want to delete this transaction?</span>
                  <div className="transactionDeletePromptActions">
                    <button
                      className="transactionDeleteConfirmButton"
                      type="button"
                      onClick={() => handleDeleteTransaction(transactionId)}
                    >
                      Yes
                    </button>
                    <button
                      className="transactionDeleteCancelButton"
                      type="button"
                      onClick={() => setConfirmDeleteTransactionId(null)}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              <div className="left">
                <div className="date">
                  {transactionDate.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short"
                  })}
                </div>
                <div className="day">
                  {transactionDate.toLocaleDateString("en-IN", {
                    weekday: "long"
                  })}
                </div>
                {transactionTime && <div className="time">{transactionTime}</div>}
              </div>

              <div className="middle">
                <div className="transactionNote">
                  <span className="transactionEmoji">{transactionIcon}</span>
                  <span>{description}</span>
                  {recurringTransaction && (
                    <span
                      className="transactionRecurringBadge"
                      title="Recurring transaction"
                    >
                      (Recurring)
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`right ${transaction.type === "expense" ? "expenseText" : "incomeText"}`}
              >
                {INR}{transaction.type === "expense" ? "-" : "+"}{transaction.amount}
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="addTransaction"
        onClick={() => {
          setConfirmDeleteTransactionId(null);
          setEditingTransaction(null);
          setShowTransaction(true);
        }}
      >
        + ADD TRANSACTION
      </button>

      {showTransaction && (
        <Transactions
          closeModal={closeTransactionModal}
          addTransaction={editingTransaction ? handleUpdateTransaction : handleCreateTransaction}
          initialTransaction={editingTransaction}
          modalTitle={editingTransaction ? "Edit" : "Add"}
          submitLabel={editingTransaction ? "Save" : "OK"}
        />
      )}
    </div>
  );
}
