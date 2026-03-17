import React, { useState } from "react";
import Transactions from "./Transactions";
import "./records.css";

export default function Records() {

  const [showTransaction, setShowTransaction] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");

  // totals
  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  return (
    <div className="records-page">

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