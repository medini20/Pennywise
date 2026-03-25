import React, { useEffect, useRef, useState } from "react";
import { FaRegCalendarAlt } from "react-icons/fa";
import "./transactions.css";
import Category from "./category1";

const API_BASE_URL = "http://localhost:5001";
const DEFAULT_EXPENSE_CATEGORIES = [
  { icon: "\uD83D\uDED2", name: "Shopping" },
  { icon: "\uD83C\uDF7D\uFE0F", name: "Food" },
  { icon: "\uD83C\uDFE0", name: "Home" },
  { icon: "\u2764\uFE0F", name: "Health" },
  { icon: "\uD83D\uDCB0", name: "Finance" }
];
const DEFAULT_INCOME_CATEGORIES = [
  { icon: "\uD83D\uDCB5", name: "Salary" },
  { icon: "\uD83D\uDCC8", name: "Bonus" },
  { icon: "\uD83D\uDCBC", name: "Freelance" },
  { icon: "\uD83D\uDC37", name: "Investment" }
];
const RECURRING_OPTIONS = ["Weekly", "Monthly", "Custom"];

const formatDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Transactions({ closeModal, addTransaction }) {
  const today = new Date();
  const dateInputRef = useRef(null);

  const [showCategory, setShowCategory] = useState(false);
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDate, setSelectedDate] = useState(formatDateValue(today));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("Monthly");
  const [expenseCategories, setExpenseCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState(DEFAULT_INCOME_CATEGORIES);

  useEffect(() => {
    fetch(`${API_BASE_URL}/budget/list`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];

        if (list.length === 0) {
          return;
        }

        const budgetCategories = list.map((budget) => ({
          name: budget.name,
          icon: budget.icon || "\uD83D\uDCB0"
        }));

        const mergedCategories = [...budgetCategories];

        DEFAULT_EXPENSE_CATEGORIES.forEach((category) => {
          const alreadyIncluded = mergedCategories.some(
            (existingCategory) =>
              existingCategory.name.trim().toLowerCase() === category.name.trim().toLowerCase()
          );

          if (!alreadyIncluded) {
            mergedCategories.push(category);
          }
        });

        setExpenseCategories(mergedCategories);
      })
      .catch(() => {
        // Keep the local fallback categories if the backend is unavailable.
      });
  }, []);

  const categories = type === "income" ? incomeCategories : expenseCategories;

  useEffect(() => {
    setSelectedCategory(null);
  }, [type]);

  const selectedCategoryDetails = categories.find(
    (category) => category.name === selectedCategory
  );

  const openDatePicker = () => {
    if (!dateInputRef.current) {
      return;
    }

    if (typeof dateInputRef.current.showPicker === "function") {
      dateInputRef.current.showPicker();
      return;
    }

    dateInputRef.current.focus();
    dateInputRef.current.click();
  };

  return (
    <div className="overlay">
      <div className="modal transactionModal">
        <div className="modalHeader">
          <span onClick={closeModal}>Cancel</span>
          <h3>Add</h3>
          <span className="headerIcon" onClick={openDatePicker}>
            <FaRegCalendarAlt />
          </span>
        </div>

        <div className="switch">
          <button
            className={type === "expense" ? "active" : ""}
            onClick={() => setType("expense")}
          >
            Expense
          </button>

          <button
            className={type === "income" ? "active" : ""}
            onClick={() => setType("income")}
          >
            Income
          </button>
        </div>

        <div className="categories">
          {categories.map((category) => (
            <div
              className={`category ${selectedCategory === category.name ? "selected" : ""}`}
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
            >
              <div className="circle">{category.icon}</div>
              <p>{category.name}</p>
            </div>
          ))}
        </div>

        <div className="addCategory" onClick={() => setShowCategory(true)}>
          + Add Categories
        </div>

        <div className="amount">{amount || 0}</div>

        <div className="recurringCard">
          <div className="recurringHeader">
            <span>Recurring Payment</span>
            <button
              type="button"
              className={`toggleSwitch ${isRecurring ? "toggleOn" : ""}`}
              onClick={() => setIsRecurring((value) => !value)}
            >
              <span className="toggleThumb" />
            </button>
          </div>

          {isRecurring && (
            <div className="recurringBody">
              <div className="recurringLabel">Frequency</div>

              <div className="frequencyRow">
                {RECURRING_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={`frequencyButton ${recurringFrequency === option ? "frequencyActive" : ""}`}
                    onClick={() => setRecurringFrequency(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <label className="inputLabel" htmlFor="transaction-date">
          Date
        </label>
        <div className="dateInputWrap">
          <input
            id="transaction-date"
            ref={dateInputRef}
            className="dateInput"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <FaRegCalendarAlt className="dateInputIcon" onClick={openDatePicker} />
        </div>

        <label className="inputLabel" htmlFor="transaction-note">
          Note
        </label>
        <input
          id="transaction-note"
          className="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter a note..."
        />

        <div className="keypad">
          <button onClick={() => setAmount(amount + "7")}>7</button>
          <button onClick={() => setAmount(amount + "8")}>8</button>
          <button onClick={() => setAmount(amount + "9")}>9</button>
          <button className="mathKey" type="button">+</button>

          <button onClick={() => setAmount(amount + "4")}>4</button>
          <button onClick={() => setAmount(amount + "5")}>5</button>
          <button onClick={() => setAmount(amount + "6")}>6</button>
          <button className="mathKey" type="button">-</button>

          <button onClick={() => setAmount(amount + "1")}>1</button>
          <button onClick={() => setAmount(amount + "2")}>2</button>
          <button onClick={() => setAmount(amount + "3")}>3</button>
          <button className="backKey" onClick={() => setAmount(amount.slice(0, -1))}>Back</button>

          <button onClick={() => setAmount(amount + ".")}>.</button>
          <button onClick={() => setAmount(amount + "0")}>0</button>
          <button
            className="ok"
            onClick={() => {
              if (!amount) return;
              if (!selectedCategory) {
                alert("Select a category");
                return;
              }

              addTransaction({
                amount: Number(amount),
                note: note || selectedCategory,
                type,
                category: selectedCategory,
                categoryIcon: selectedCategoryDetails?.icon || "",
                transactionDate: selectedDate,
                recurring: isRecurring,
                recurringFrequency
              });
              closeModal();
            }}
          >
            OK
          </button>
        </div>
      </div>

      {showCategory && (
        <Category
          closeCategory={() => setShowCategory(false)}
          addNewCategory={(newCategory) => {
            if (type === "income") {
              setIncomeCategories((currentCategories) => [...currentCategories, newCategory]);
              return;
            }

            setExpenseCategories((currentCategories) => [...currentCategories, newCategory]);
          }}
        />
      )}
    </div>
  );
}
