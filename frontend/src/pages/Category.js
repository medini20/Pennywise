import React, { useState } from "react";
import AestheticDatePicker from "../components/AestheticDatePicker";
import { getStoredUser } from "../services/authStorage";
import { getCurrentMonthDateRange } from "../utils/budgetDates";
import "./Category.css";

const getMonthNumberFromDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date().getMonth() + 1;
  }

  return Number(value.slice(5, 7));
};

export default function Category({ closeCategory, addNewCategory }) {
  const storedUser = getStoredUser();
  const userId = storedUser?.id ?? storedUser?.user_id ?? 1;
  const defaultMonthRange = getCurrentMonthDateRange();
  const [view, setView] = useState("select");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");
  const [startDate, setStartDate] = useState(defaultMonthRange.startDate);
  const [endDate, setEndDate] = useState(defaultMonthRange.endDate);
  const [errorMessage, setErrorMessage] = useState("");

  const predefinedCategories = [
    { name: "Food", icon: "\uD83C\uDF7D\uFE0F" },
    { name: "Home", icon: "\uD83C\uDFE0" },
    { name: "Shopping", icon: "\uD83D\uDED2" },
    { name: "Health", icon: "\u2764\uFE0F" },
    { name: "Finance", icon: "\uD83D\uDCB0" }
  ];

  const icons = [
    "\uD83C\uDF7D\uFE0F", "\uD83C\uDFE0", "\uD83D\uDED2", "\uD83D\uDE97", "\u2615",
    "\u2764\uFE0F", "\uD83C\uDFAE", "\uD83D\uDCF1", "\uD83C\uDFB5", "\uD83C\uDFCB\uFE0F",
    "\uD83D\uDC55", "\u2708\uFE0F", "\uD83D\uDC36", "\uD83D\uDCB0", "\u26A1",
    "\uD83C\uDF81", "\u2702\uFE0F", "\uD83D\uDCDA"
  ];

  const handleSelectPredefined = (category) => {
    setName(category.name);
    setSelectedIcon(category.icon);
    setStartDate(defaultMonthRange.startDate);
    setEndDate(defaultMonthRange.endDate);
    setView("create");
  };

  const handleAddNewCustom = () => {
    setName("");
    setSelectedIcon("");
    setStartDate(defaultMonthRange.startDate);
    setEndDate(defaultMonthRange.endDate);
    setView("create");
  };

  const handleStartDateChange = (nextStartDate) => {
    setStartDate(nextStartDate);

    if (endDate && nextStartDate && nextStartDate > endDate) {
      setEndDate(nextStartDate);
    }
  };

  const handleEndDateChange = (nextEndDate) => {
    setEndDate(nextEndDate);

    if (startDate && nextEndDate && nextEndDate < startDate) {
      setStartDate(nextEndDate);
    }
  };

  const handleSave = () => {
    if (!name || !amount || !selectedIcon) {
      alert("Please enter Name, Amount, and choose an Icon!");
      return;
    }

    if (!userId) {
      setErrorMessage("Please log in again before creating a budget category.");
      return;
    }

    if (startDate > endDate) {
      setErrorMessage("Start date must be on or before end date.");
      return;
    }

    setErrorMessage("");

    const budgetData = {
      name,
      amount: Number(amount),
      icon: selectedIcon,
      user_id: userId,
      month: getMonthNumberFromDate(startDate),
      start_date: startDate,
      end_date: endDate
    };

    fetch("http://localhost:5001/budget/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(budgetData)
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          addNewCategory();
          closeCategory();
          return;
        }

        setErrorMessage(data.error || "Unable to save category.");
      })
      .catch((err) => {
        console.error("Server Error:", err);
        setErrorMessage("Backend is offline. Start the server on port 5001 and try again.");
      });
  };

  return (
    <div className="category-overlay">
      <div className="category-modal">
        {view === "select" && (
          <>
            <div className="category-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Add Category</h3>
              <span className="close-x" onClick={closeCategory}>×</span>
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
              <span className="close-x" onClick={closeCategory}>×</span>
            </div>

            <div className="category-body">
              {errorMessage && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    color: "#fecaca",
                    fontSize: "14px"
                  }}
                >
                  {errorMessage}
                </div>
              )}

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
                <label>MONTHLY BUDGET (Rs)</label>
                <input
                  className="category-input"
                  type="number"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="category-date-grid">
                <div className="input-group">
                  <label>START DATE</label>
                  <AestheticDatePicker
                    value={startDate}
                    onChange={handleStartDateChange}
                  />
                </div>

                <div className="input-group">
                  <label>END DATE</label>
                  <AestheticDatePicker
                    value={endDate}
                    onChange={handleEndDateChange}
                    align="right"
                  />
                </div>
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
