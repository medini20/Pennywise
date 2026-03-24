import React, { useEffect, useState } from "react";
import Transactions from "./Transactions";
import Notifications from "../components/Notifications";
import { MdWarning } from "react-icons/md";
import "./records.css";

const API_BASE_URL = "http://localhost:5001";

export default function Records() {
  const [showTransaction, setShowTransaction] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);

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
        {[...transactions]
          .reverse()
          .filter((transaction) => {
            if (filter === "all") {
              return true;
            }

            return transaction.type === filter;
          })
          .map((transaction, index) => (
            <div className="transaction" key={index}>
              <div className="left">
                <div className="date">{transaction.date}</div>
                <div className="day">{transaction.day}</div>
              </div>
              <div className="middle">
                {transaction.note}
              </div>
              <div className={`right ${transaction.type === "expense" ? "expenseText" : "incomeText"}`}>
                ₹{transaction.type === "expense" ? "-" : "+"}{transaction.amount}
              </div>
            </div>
          ))}
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
          addTransaction={(data) => {
            setTransactions((prevTransactions) => [...prevTransactions, data]);
          }}
        />
      )}
    </div>
  );
}
