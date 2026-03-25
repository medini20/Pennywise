import React, { useEffect, useState } from "react";
import Transactions from "./Transactions";
import Notifications from "../components/Notifications";
import { MdWarning } from "react-icons/md";
import "./records.css";

const API_BASE_URL = "http://localhost:5001";

const formatTransactionDate = (transaction) => {
  if (transaction.transaction_date) {
    return new Date(transaction.transaction_date);
  }

  if (transaction.transactionDate) {
    return new Date(`${transaction.transactionDate}T00:00:00`);
  }

  return new Date();
};

export default function Records() {
  const [showTransaction, setShowTransaction] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);

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

      <div className="cards">
        <div
          className="card expenseCard"
          onClick={() => setFilter("expense")}
        >
          <div className="cardTitle">
            <span className="icon expenseIcon">↘</span>
            <span>Expenses</span>
          </div>
          <h2>₹{totalExpense}</h2>
        </div>

        <div
          className="card incomeCard"
          onClick={() => setFilter("income")}
        >
          <div className="cardTitle">
            <span className="icon incomeIcon">↗</span>
            <span>Income</span>
          </div>
          <h2>₹{totalIncome}</h2>
        </div>

        <div
          className="card balanceCard"
          onClick={() => setFilter("all")}
        >
          <div className="cardTitle">
            <span className="icon balanceIcon">◎</span>
            <span>Balance</span>
          </div>
          <h2>₹{balance}</h2>
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

        {[...transactions]
          .reverse()
          .filter((transaction) => (filter === "all" ? true : transaction.type === filter))
          .map((transaction, index) => {
            const transactionDate = formatTransactionDate(transaction);
            const description = transaction.note || transaction.description || "No description";

            return (
              <div className="transaction" key={index}>
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
                </div>

                <div className="middle">
                  <div className="transactionNote">
                    {transaction.categoryIcon && (
                      <span className="transactionEmoji">{transaction.categoryIcon}</span>
                    )}
                    <span>{description}</span>
                  </div>
                </div>

                <div className={`right ${transaction.type === "expense" ? "expenseText" : "incomeText"}`}>
                  ₹{transaction.type === "expense" ? "-" : "+"}{transaction.amount}
                </div>
              </div>
            );
          })}
      </div>

      <button
        className="addTransaction"
        onClick={() => setShowTransaction(true)}
      >
        + ADD TRANSACTION
      </button>

      {showTransaction && (
        <Transactions
          closeModal={() => setShowTransaction(false)}
          addTransaction={async (data) => {
            await fetch(`${API_BASE_URL}/api/transactions/add`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                user_id: 1,
                amount: data.amount,
                type: data.type,
                description: data.note,
                transaction_date: data.transactionDate
              })
            });

            setTransactions((prevTransactions) => [
              ...prevTransactions,
              {
                ...data,
                description: data.note,
                transaction_date: data.transactionDate
              }
            ]);
          }}
        />
      )}
    </div>
  );
}
