import React, { useEffect, useState } from "react";
import Transactions from "./Transactions";
import Notifications from "../components/Notifications";
import { MdWarning } from "react-icons/md";
import "./records.css";

const API_BASE_URL = "http://localhost:5001";
const INR = "\u20B9";

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

export default function Records() {
  const [showTransaction, setShowTransaction] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/transactions?user_id=1`)
      .then((res) => res.json())
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => setTransactions([]));
  }, []);

  const totalExpense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const balance = totalIncome - totalExpense;

  useEffect(() => {
    localStorage.setItem("currentSpending", totalExpense.toString());
  }, [totalExpense]);

  useEffect(() => {
    const checkTriggeredAlerts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/alerts/check`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            current_spending: totalExpense
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to check alerts right now.");
        }

        const triggeredAlerts = Array.isArray(data.triggered_alerts)
          ? data.triggered_alerts
          : [];

        setNotifications(
          triggeredAlerts.map((alert) => ({
            id: alert.id,
            percentage: alert.percentage,
            message: `Spending reached ${alert.percentage}% of your budget`,
            icon: <MdWarning />
          }))
        );
      } catch (error) {
        console.error(error.message);
      }
    };

    checkTriggeredAlerts();
  }, [totalExpense]);

  const removeNotification = (id) => {
    setNotifications((prevNotifications) =>
      prevNotifications.filter((notification) => notification.id !== id)
    );
  };

  return (
    <div className="records-page">
      <Notifications
        notifications={notifications}
        removeNotification={removeNotification}
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

      <select className="monthDropdown">
        {[
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ].map((month, index) => (
          <option key={index}>
            {month} 2026
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

        {transactions
          .filter((transaction) => (filter === "all" ? true : transaction.type === filter))
          .map((transaction, index) => {
            const transactionDate = formatTransactionDate(transaction);
            const transactionTime = getTransactionTime(transaction);
            const transactionIcon = getTransactionIcon(transaction);
            const description = transaction.note || transaction.description || "No description";

            return (
              <div className="transaction" key={transaction.transaction_id || index}>
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

      <button className="addTransaction" onClick={() => setShowTransaction(true)}>
        + ADD TRANSACTION
      </button>

      {showTransaction && (
        <Transactions
          closeModal={() => setShowTransaction(false)}
          addTransaction={async (data) => {
            try {
              setRequestError("");

              const response = await fetch(`${API_BASE_URL}/api/transactions/add`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  user_id: 1,
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
                throw new Error(result.message || "Unable to save transaction.");
              }

              setTransactions((prevTransactions) => [
                {
                  transaction_id: result.transaction_id || `local-${Date.now()}`,
                  transaction_date: data.transactionDate,
                  created_at: result.created_at || new Date().toISOString(),
                  category_name: data.category,
                  category_icon: data.categoryIcon,
                  description: data.note || data.category,
                  amount: data.amount,
                  type: data.type
                },
                ...prevTransactions
              ]);
            } catch (error) {
              setRequestError(
                error.message === "Failed to fetch"
                  ? "Backend is offline. Start the server on port 5001 and try again."
                  : error.message
              );
            }
          }}
        />
      )}
    </div>
  );
}
