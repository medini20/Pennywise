import React, { useState } from "react";
import "./Category.css"; // Ensure your provided CSS is in this file

export default function Category({ closeCategory, addNewCategory }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(""); 
  const [selectedIcon, setSelectedIcon] = useState("");

  const icons = ["🏠","🚗","☕","🏡","❤️","🎮","📱","🎵","🍽️","🏋️","🎒","💳","🎁","📺","📘","👕","✂️","💊","⛽","⚡"];

  const handleSave = () => {
    if (!name || !amount || !selectedIcon) {
      alert("Please enter Name, Amount, and choose an Icon!");
      return;
    }

    const budgetData = {
      name: name,
      amount: Number(amount),
      icon: selectedIcon,
      user_id: 1, 
      month: 1
    };

    fetch("http://localhost:5001/budget/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(budgetData),
    })
    .then((res) => {
      if (res.ok) {
        addNewCategory(); 
        closeCategory();
      }
    })
    .catch((err) => console.error("Server Error:", err));
  };

  return (
    <div className="category-overlay">
      <div className="category-modal">
        
        <div className="category-modal-header">
          <span className="nav-text" onClick={closeCategory}>Cancel</span>
          <h3 style={{ margin: 0, fontSize: "18px" }}>Add Category</h3>
          <span className="close-x" onClick={closeCategory}>✖</span>
        </div>

        <div className="category-body">
          {/* Category Name Input */}
          <div className="input-group">
            <label>CATEGORY NAME</label>
            <input
              className="category-input"
              placeholder="e.g. Entertainment"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Budget Amount Input */}
          <div className="input-group">
            <label>MONTHLY BUDGET (₹)</label>
            <input
              className="category-input"
              type="number"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <p className="section-label">Choose Icon</p>

          <div className="icon-grid">
            {icons.map((icon, i) => (
              <div
                key={i}
                className={`icon-item ${selectedIcon === icon ? "active" : ""}`}
                onClick={() => setSelectedIcon(icon)}
              >
                {icon}
              </div>
            ))}
          </div>
        </div>

        <div className="category-footer">
          <button className="btn-cancel-modal" onClick={closeCategory}>
            Cancel
          </button>
          <button className="btn-add-modal" onClick={handleSave}>
            Add Category
          </button>
        </div>

      </div>
    </div>
  );
}