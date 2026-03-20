import React, { useState, useEffect } from "react";
import Transactions from "./Transactions";
import Notifications from "../components/Notifications";
import { MdWarning } from "react-icons/md";
import "./records.css";

export default function Records() {
  const [showTransaction, setShowTransaction] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);

  // --- LOGIC START: READING EXPENSES & BUDGET ---
  
  // Calculate totals (Ensure amount is treated as a number)
  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = totalIncome - totalExpense;

  // Sync totalExpense to localStorage so Alerts page can read it
  useEffect(() => {
    localStorage.setItem("currentSpending", totalExpense.toString());
  }, [totalExpense]);

  // --- LOGIC END ---

  // remove notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // add notification
  const addNotification = (percentage) => {
    setNotifications(prev => {
      const exists = prev.find(n => n.percentage === percentage);
      if (exists) return prev;

      return [
        ...prev,
        {
          id: Date.now() + Math.random(),
          percentage: percentage,
          message: `Spending reached ${percentage}% of your budget`,
          icon: <MdWarning />
        }
      ];
    });
  };

  // check customizable alert thresholds
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("budgetAlerts"));
    const alerts = Array.isArray(saved) ? saved : [];

    // Reading the budget set from Alerts.js
    const budget = Number(localStorage.getItem("totalBudget")) || 5000;

    const percent = (totalExpense / budget) * 100;

    alerts.forEach(alert => {
      if (percent >= alert.percentage) {
        addNotification(alert.percentage);
      }
    });
  }, [totalExpense]);

  return (
    <div className="records-page">
      {/* Notifications */} 
      <Notifications
        notifications={notifications}
        removeNotification={removeNotification}
      />

      {/* CARDS */}
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

      {/* MONTH */} 
      <select className="monthDropdown">
        {[
          "Jan","Feb","Mar","Apr","May","Jun",
          "Jul","Aug","Sep","Oct","Nov","Dec"
        ].map((month, i) => (
          <option key={i}>
            {month} 2026
          </option>
        ))}
      </select>

      {/* HEADER */}
      <div className="tableHeader">
        <span>Date</span>
        <span>Description</span>
        <span></span>
      </div>

      {/* TRANSACTIONS */}
      <div className="transactions">
        {[...transactions]
          .reverse()
          .filter(t => {
            if (filter === "all") return true;
            return t.type === filter;
          })
          .map((t, i) => (
            <div className="transaction" key={i}>
              <div className="left">
                <div className="date">{t.date}</div>
                <div className="day">{t.day}</div>
              </div>
              <div className="middle">
                {t.note}
              </div>
              <div className={`right ${t.type === "expense" ? "expenseText" : "incomeText"}`}>
                ₹{t.type === "expense" ? "-" : "+"}{t.amount}
              </div>
            </div>
          ))}
      </div>

      {/* ADD BUTTON */}
      <button
        className="addTransaction"
        onClick={() => setShowTransaction(true)}
      >
        + ADD TRANSACTION
      </button>

      {/* MODAL */}
      {showTransaction && (
        <Transactions
          closeModal={() => setShowTransaction(false)}
          addTransaction={(data) => {
            setTransactions([...transactions, data]);
          }}
        />
      )}
    </div>
  );
}