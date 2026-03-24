import React, { useState, useEffect } from "react";
import Transactions from "./Transactions";
import "./records.css";

export default function Records() {

  const [showTransaction, setShowTransaction] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");

  //  FETCH FROM BACKEND
  useEffect(() => {
    fetch("http://localhost:5001/api/transactions?user_id=1")
      .then(res => res.json())
      .then(data => setTransactions(data));
  }, []);

  // totals
  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

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

        {transactions.length === 0 && (
          <div style={{textAlign:"center", marginTop:"20px", color:"#9ca3af"}}>
            No transactions yet
          </div>
        )}

        {[...transactions]
          .reverse()
          .filter(t => {
            if (filter === "all") return true;
            return t.type === filter;
          })
          .map((t, i) => (
            <div className="transaction" key={i}>

              <div className="left">
               <div className="date">
  {new Date(t.transaction_date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  })}
</div>
             <div className="day">
  {new Date(t.transaction_date).toLocaleDateString("en-IN", {
    weekday: "long"
  })}
</div>
              </div>

              <div className="middle">
                {t.note || t.description}
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
          addTransaction={async (data) => {

            await fetch("http://localhost:5001/api/transactions/add", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
  user_id: 1,
  amount: data.amount,
  type: data.type,
  description: data.note   // 🔥 IMPORTANT FIX
})
            });

            // update UI instantly
            setTransactions([
  ...transactions,
  {
    ...data,
    transaction_date: new Date()
  }
]);
          }}
        />
      )}

    </div>
  );
}