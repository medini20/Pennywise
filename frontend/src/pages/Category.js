import React, { useState } from "react";
import "../pages/Category.css";

export default function Category({ closeCategory, addNewCategory }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(""); // Added amount state
  const [selectedIcon, setSelectedIcon] = useState("");

  const icons = ["🏠","🚗","☕","🏡","❤️","🎮","📱","🎵","🍽️","🏋️","🎒","💳","🎁","📺","📘","👕","✂️","💊","⛽","⚡"];


  const handleSave = () => {
  if (!name || !selectedIcon || !amount) {
    alert("Please fill in all fields.");
    return;
  }

  fetch("http://localhost:5001/budget/add", {
    method: "POST", // CRITICAL: Must be POST
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name,
      amount: Number(amount),
      icon: selectedIcon,
      user_id: 1, // Matches controller
      month: 1
    }),
  })
  .then((res) => {
    if (res.ok) {
      addNewCategory(); // This refreshes the list in Budget.js
      closeCategory();
    } else {
      alert("Failed to save category to server.");
    }
  })
  .catch(err => console.error("Error:", err));
};

  return (
    <div className="overlay">
      <div className="modal small">
        <div className="modalHeader">
          <h3 style={{ margin: 0 }}>Add Category</h3>
          <span className="close-x" onClick={closeCategory}>✖</span>
        </div>

        <div className="input-group">
          <label>Category Name</label>
          <input
            className="note"
            placeholder="e.g. Groceries"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="input-group" style={{ marginTop: "15px" }}>
          <label>Monthly Budget (₹)</label>
          <input
            className="note"
            type="number"
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <p style={{ marginTop: "20px", marginBottom: "10px", fontWeight: "bold" }}>Choose Icon</p>

        <div className="iconGrid">
          {icons.map((icon, i) => (
            <div
              key={i}
              className={`iconBox ${selectedIcon === icon ? "selected" : ""}`}
              onClick={() => setSelectedIcon(icon)}
            >
              {icon}
            </div>
          ))}
        </div>

        <div className="buttons">
          <button className="cancel-btn-modal" onClick={closeCategory}>
            Cancel
          </button>
          <button className="add-btn-modal" onClick={handleSave}>
            Add Category
          </button>
        </div>
      </div>
    </div>
  );
}