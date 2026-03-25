import React, { useState } from "react";
import "./Category.css"; 

export default function Category({ closeCategory, addNewCategory }) {
  const [view, setView] = useState("select");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");

 const predefinedCategories = [
    { name: "Food", icon: "🍽️" },
    { name: "Transport", icon: "🚗" },
    { name: "Finance", icon: "💰" },
    { name: "Health", icon: "🏥" },
    { name: "Electronics", icon: "📱" },
    { name: "Travel", icon: "✈️" },
    { name: "Clothing", icon: "👕" },
    { name: "Pets", icon: "🐶" }
  ];

  // Distinct icons covering 99% of expenses without redundancies
  const icons = [
    "🏠", "🚗", "✈️", "🍽️", "🛒", "☕", 
    "🏥", "🎮", "📱", "👕", "⚡", "🌐", 
    "📚", "🐶", "🏋️", "🎁", "✂️", "💰"
  ];

  const handleSelectPredefined = (category) => {
    setName(category.name);
    setSelectedIcon(category.icon);
    setView("create");
  };

  const handleAddNewCustom = () => {
    setName("");
    setSelectedIcon("");
    setView("create");
  };

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
        
        {view === "select" && (
          <>
            <div className="category-modal-header">
              <span className="nav-text" onClick={closeCategory}>Cancel</span>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Add Category</h3>
              <span className="nav-text" style={{ fontSize: "16px" }}>📅</span>
            </div>

            <div className="predefined-grid">
              {predefinedCategories.map((cat, i) => (
                <button 
                  key={i} 
                  className="predefined-item"
                  onClick={() => handleSelectPredefined(cat)}
                >
                  <span className="p-icon">{cat.icon}</span>
                  <span className="p-name">{cat.name}</span>
                </button>
              ))}
            </div>

            <button className="add-custom-btn" onClick={handleAddNewCustom}>
              + Add Categories
            </button>
          </>
        )}

        {view === "create" && (
          <>
            <div className="category-modal-header">
              <span className="nav-text" onClick={() => setView("select")}>Back</span>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Add Category</h3>
              <span className="close-x" onClick={closeCategory}>✖</span>
            </div>

            <div className="category-body">
              <div className="input-group">
                <label>CATEGORY NAME</label>
                <input
                  className="category-input"
                  placeholder="e.g. Entertainment"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>MONTHLY BUDGET (₹)</label>
                <input
                  className="category-input"
                  type="number"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
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
            </div>

            <div className="category-footer">
              <button className="btn-cancel-modal" onClick={() => setView("select")}>
                Cancel
              </button>
              <button className="btn-add-modal" onClick={handleSave}>
                Save Category
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
