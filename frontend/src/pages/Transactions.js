import React, { useState } from "react";
import "./transactions.css";
import Category from "./Category";

export default function Transactions({ closeModal, addTransaction }) {

  const [showCategory, setShowCategory] = useState(false);
  const [type, setType] = useState("expense");

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [categories, setCategories] = useState([
    {icon:"👕",name:"Clothing"},
    {icon:"🚗",name:"Car"},
    {icon:"🍷",name:"Alcohol"},
    {icon:"🚬",name:"Cigarettes"},
    {icon:"📱",name:"Electronics"},
    {icon:"✈️",name:"Travel"},
    {icon:"❤️",name:"Health"},
    {icon:"🐶",name:"Pets"}
  ]);

  return (
    <div className="overlay">

      <div className="modal">

        <div className="modalHeader">
          <span onClick={closeModal}>Cancel</span>
          <h3>Add</h3>
          <span>📅</span>
        </div>

        {/* SWITCH */}
        <div className="switch">
          <button
            className={type==="expense" ? "active" : ""}
            onClick={() => setType("expense")}
          >
            Expense
          </button>

          <button
            className={type==="income" ? "active" : ""}
            onClick={() => setType("income")}
          >
            Income
          </button>
        </div>

        {/* CATEGORIES */}
        <div className="categories">
          {categories.map((c,i)=>(
            <div 
              className={`category ${selectedCategory === c.name ? "selected" : ""}`}
              key={i}
              onClick={() => setSelectedCategory(c.name)}
            >
              <div className="circle">{c.icon}</div>
              <p>{c.name}</p>
            </div>
          ))}
        </div>

        {/* ADD CATEGORY */}
        <div
          className="addCategory"
          onClick={() => setShowCategory(true)}
        >
          + Add Categories
        </div>

        {/* AMOUNT */}
        <div className="amount">{amount || 0}</div>

        {/* NOTE */}
        <input
          className="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter a note..."
        />

        {/* KEYPAD */}
        <div className="keypad">

          <button onClick={() => setAmount(amount + "7")}>7</button>
          <button onClick={() => setAmount(amount + "8")}>8</button>
          <button onClick={() => setAmount(amount + "9")}>9</button>
          <button className="today">Today</button>

          <button onClick={() => setAmount(amount + "4")}>4</button>
          <button onClick={() => setAmount(amount + "5")}>5</button>
          <button onClick={() => setAmount(amount + "6")}>6</button>
          <button>+</button>

          <button onClick={() => setAmount(amount + "1")}>1</button>
          <button onClick={() => setAmount(amount + "2")}>2</button>
          <button onClick={() => setAmount(amount + "3")}>3</button>
          <button>-</button>

          <button onClick={() => setAmount(amount + ".")}>.</button>
          <button onClick={() => setAmount(amount + "0")}>0</button>
          <button onClick={() => setAmount(amount.slice(0, -1))}>⌫</button>

          <button
            className="ok"
            onClick={() => {
              if (!amount) return;
              if (!selectedCategory) {
                alert("Select a category");
                return;
              }

              const newTransaction = {
                amount: Number(amount),
                note: note || selectedCategory,
                type,
                category: selectedCategory,
                date: new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short"
                }),
                day: new Date().toLocaleDateString("en-GB", {
                  weekday: "long"
                })
              };

              addTransaction(newTransaction);
              closeModal();
            }}
          >
            ✔
          </button>

        </div>

      </div>

      {showCategory && (
        <Category
          closeCategory={() => setShowCategory(false)}
          addNewCategory={(newCat) => {
            setCategories([...categories, newCat]);
          }}
        />
      )}

    </div>
  );
}