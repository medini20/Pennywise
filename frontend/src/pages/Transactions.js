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

const getTransactionDateValue = (transaction, fallbackDate) => {
  if (typeof transaction?.transaction_date === "string" && transaction.transaction_date.trim()) {
    return transaction.transaction_date.slice(0, 10);
  }

  if (typeof transaction?.transactionDate === "string" && transaction.transactionDate.trim()) {
    return transaction.transactionDate.slice(0, 10);
  }

  return formatDateValue(fallbackDate);
};

const getTransactionCategoryName = (transaction) =>
  transaction?.category_name || transaction?.category || "";

const getTransactionCategoryIcon = (transaction) =>
  transaction?.category_icon || transaction?.categoryIcon || "";

const getTransactionDescription = (transaction) =>
  transaction?.note || transaction?.description || "";

const normalizeAmountInput = (value) => {
  const cleanedValue = value.replace(/[^\d.]/g, "");
  const [wholeNumberPart, ...decimalParts] = cleanedValue.split(".");

  if (decimalParts.length === 0) {
    return wholeNumberPart;
  }

  return `${wholeNumberPart}.${decimalParts.join("")}`;
};

export default function Transactions({
  closeModal = () => {},
  addTransaction = () => {},
  initialTransaction = null,
  modalTitle = "Add",
  submitLabel = "OK"
}) {
  const today = new Date();
  const isEditMode = Boolean(initialTransaction);
  const initialTransactionDate = getTransactionDateValue(initialTransaction, today);
  const initialCategoryName = getTransactionCategoryName(initialTransaction);
  const initialCategoryIcon = getTransactionCategoryIcon(initialTransaction);
  const initialDescription = getTransactionDescription(initialTransaction);
  const dateInputRef = useRef(null);
  const recurringStartDateRef = useRef(null);
  const recurringEndDateRef = useRef(null);
  const hasInitializedTypeRef = useRef(false);

  const [showCategory, setShowCategory] = useState(false);
  const [type, setType] = useState(initialTransaction?.type || "expense");
  const [amount, setAmount] = useState(
    initialTransaction?.amount ? String(initialTransaction.amount) : ""
  );
  const [note, setNote] = useState(initialDescription);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryName || null);
  const [selectedDate, setSelectedDate] = useState(initialTransactionDate);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("Monthly");
  const [recurringStartDate, setRecurringStartDate] = useState(initialTransactionDate);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringMessage, setRecurringMessage] = useState("");
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
    if (!hasInitializedTypeRef.current) {
      hasInitializedTypeRef.current = true;
      return;
    }

    setSelectedCategory(null);
  }, [type]);

  useEffect(() => {
    if (!selectedCategory) {
      return;
    }

    const categoryToInsert = {
      name: selectedCategory,
      icon: initialCategoryIcon || "\uD83D\uDCB0"
    };

    if (type === "income") {
      setIncomeCategories((currentCategories) =>
        currentCategories.some(
          (category) => category.name.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
        )
          ? currentCategories
          : [...currentCategories, categoryToInsert]
      );
      return;
    }

    setExpenseCategories((currentCategories) =>
      currentCategories.some(
        (category) => category.name.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
      )
        ? currentCategories
        : [...currentCategories, categoryToInsert]
    );
  }, [initialCategoryIcon, selectedCategory, type]);

  const selectedCategoryDetails = categories.find(
    (category) => category.name === selectedCategory
  );

  const dismissActiveElement = () => {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  };

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

  const openRecurringDatePicker = (dateInputRefValue) => {
    if (!dateInputRefValue?.current) {
      return;
    }

    if (typeof dateInputRefValue.current.showPicker === "function") {
      dateInputRefValue.current.showPicker();
      return;
    }

    dateInputRefValue.current.focus();
    dateInputRefValue.current.click();
  };

  const handleRecurringToggle = () => {
    dismissActiveElement();
    setIsRecurring((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        setRecurringStartDate(selectedDate);
      } else {
        setRecurringMessage("");
      }

      return nextValue;
    });
  };

  const appendAmountValue = (value) => {
    setAmount((currentAmount) => normalizeAmountInput(`${currentAmount}${value}`));
  };

  const handleSubmitTransaction = async () => {
    if (!amount) {
      return;
    }

    if (!selectedCategory) {
      alert("Select a category");
      return;
    }

    const wasSaved = await Promise.resolve(
      addTransaction({
        amount: Number(amount),
        note: note || selectedCategory,
        type,
        category: selectedCategory,
        categoryIcon: selectedCategoryDetails?.icon || initialCategoryIcon || "",
        transactionDate: selectedDate,
        recurring: isRecurring,
        recurringFrequency
      })
    );

    if (wasSaved !== false) {
      closeModal();
    }
  };

  const handleSaveRecurringPayment = async () => {
    if (!amount) {
      setRecurringMessage("Enter an amount before saving the recurring payment.");
      return;
    }

    if (!selectedCategory) {
      alert("Select a category");
      return;
    }

    if (!recurringStartDate) {
      setRecurringMessage("Select a recurring payment start date.");
      return;
    }

    if (recurringEndDate && recurringEndDate < recurringStartDate) {
      setRecurringMessage("End date must be the same as or after the start date.");
      return;
    }

    const wasSaved = await Promise.resolve(
      addTransaction({
        amount: Number(amount),
        note: note || selectedCategory,
        type,
        category: selectedCategory,
        categoryIcon: selectedCategoryDetails?.icon || initialCategoryIcon || "",
        transactionDate: recurringStartDate,
        recurring: true,
        recurringFrequency,
        recurringStartDate,
        recurringEndDate
      })
    );

    if (wasSaved !== false) {
      closeModal();
    }
  };

  return (
    <div className="overlay">
      <div className="modal transactionModal">
        <div className="modalHeader">
          <span onClick={closeModal}>Cancel</span>
          <h3>{modalTitle}</h3>
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

        <input
          className="amount amountInput"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(normalizeAmountInput(event.target.value))}
          placeholder="0"
        />

        {!isEditMode && (
          <div className="recurringCard">
            <div className="recurringHeader">
              <span>Recurring Payment</span>
              <button
                type="button"
                className={`toggleSwitch ${isRecurring ? "toggleOn" : ""}`}
                onClick={handleRecurringToggle}
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
                      onClick={() => {
                        dismissActiveElement();
                        setRecurringFrequency(option);
                        setRecurringMessage("");
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <div className="recurringDateGrid">
                  <div className="recurringDateField">
                    <label className="inputLabel recurringInputLabel" htmlFor="recurring-start-date">
                      Start Date
                    </label>
                    <div className="dateInputWrap">
                      <input
                        id="recurring-start-date"
                        ref={recurringStartDateRef}
                        className="dateInput"
                        type="date"
                        value={recurringStartDate}
                        onChange={(event) => {
                          setRecurringStartDate(event.target.value);
                          setRecurringMessage("");
                        }}
                      />
                      <FaRegCalendarAlt
                        className="dateInputIcon"
                        onClick={() => openRecurringDatePicker(recurringStartDateRef)}
                      />
                    </div>
                  </div>

                  <div className="recurringDateField">
                    <label className="inputLabel recurringInputLabel" htmlFor="recurring-end-date">
                      End Date
                    </label>
                    <div className="dateInputWrap">
                      <input
                        id="recurring-end-date"
                        ref={recurringEndDateRef}
                        className="dateInput"
                        type="date"
                        value={recurringEndDate}
                        min={recurringStartDate}
                        onChange={(event) => {
                          setRecurringEndDate(event.target.value);
                          setRecurringMessage("");
                        }}
                      />
                      <FaRegCalendarAlt
                        className="dateInputIcon"
                        onClick={() => openRecurringDatePicker(recurringEndDateRef)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="recurringSaveButton"
                  onClick={handleSaveRecurringPayment}
                >
                  <span className="recurringSaveIcon">✓</span>
                  <span>Save Recurring Payment</span>
                </button>

                {recurringMessage && (
                  <p className="recurringFeedback recurringFeedbackError">
                    {recurringMessage}
                  </p>
                )}

                <label className="inputLabel" htmlFor="recurring-note">
                  Note
                </label>
                <input
                  id="recurring-note"
                  className="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Enter a note..."
                />
              </div>
            )}
          </div>
        )}

        {!isRecurring && (
          <>
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
          </>
        )}

        {!isRecurring && (
          <>
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
          </>
        )}

        {!isRecurring && (
          <div className="keypad">
            <button onClick={() => appendAmountValue("7")}>7</button>
            <button onClick={() => appendAmountValue("8")}>8</button>
            <button onClick={() => appendAmountValue("9")}>9</button>
            <button className="mathKey" type="button">+</button>

            <button onClick={() => appendAmountValue("4")}>4</button>
            <button onClick={() => appendAmountValue("5")}>5</button>
            <button onClick={() => appendAmountValue("6")}>6</button>
            <button className="mathKey" type="button">-</button>

            <button onClick={() => appendAmountValue("1")}>1</button>
            <button onClick={() => appendAmountValue("2")}>2</button>
            <button onClick={() => appendAmountValue("3")}>3</button>
            <button
              className="backKey"
              onClick={() => setAmount((currentAmount) => currentAmount.slice(0, -1))}
            >
              Back
            </button>

            <button onClick={() => appendAmountValue(".")}>.</button>
            <button onClick={() => appendAmountValue("0")}>0</button>
            <button className="ok" onClick={handleSubmitTransaction}>{submitLabel}</button>
          </div>
        )}
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
