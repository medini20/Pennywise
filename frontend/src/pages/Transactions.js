import React, { useEffect, useRef, useState } from "react";
import { FaCheck, FaRegCalendarAlt } from "react-icons/fa";
import { getStoredUser } from "../services/authStorage";
import "./transactions.css";
import Category from "./category1";
import { API_BASE_URL } from "../config/api";
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
const TODAY_DATE_VALUE = formatDateValue(new Date());
const toDateFromValue = (value) => {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
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

const mergeCategories = (baseCategories, fetchedCategories) => {
  const dedupedFetchedCategories = [];

  fetchedCategories.forEach((category) => {
    const normalizedName = category.name.trim().toLowerCase();
    const alreadyIncluded = dedupedFetchedCategories.some(
      (existingCategory) => existingCategory.name.trim().toLowerCase() === normalizedName
    );

    if (!alreadyIncluded) {
      dedupedFetchedCategories.push(category);
    }
  });

  const mergedCategories = [...dedupedFetchedCategories];

  baseCategories.forEach((category) => {
    const alreadyIncluded = mergedCategories.some(
      (existingCategory) =>
        existingCategory.name.trim().toLowerCase() === category.name.trim().toLowerCase()
    );

    if (!alreadyIncluded) {
      mergedCategories.push(category);
    }
  });

  return mergedCategories;
};

export default function Transactions({
  closeModal = () => {},
  addTransaction = () => {},
  initialTransaction = null,
  modalTitle = "Add",
  submitLabel = "OK"
}) {
  const today = new Date();
  const storedUser = getStoredUser();
  const userId = storedUser?.id ?? storedUser?.user_id ?? null;
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
  const [customIntervalDays, setCustomIntervalDays] = useState("");
  const [recurringStartDate, setRecurringStartDate] = useState(initialTransactionDate);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringMessage, setRecurringMessage] = useState("");
  const [expenseCategories, setExpenseCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState(DEFAULT_INCOME_CATEGORIES);

  useEffect(() => {
    if (!userId) {
      setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
      setIncomeCategories(DEFAULT_INCOME_CATEGORIES);
      return;
    }

    fetch(`${API_BASE_URL}/api/categories?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const expenseList = list
          .filter((category) => category.type !== "income")
          .map((category) => ({
            name: category.name,
            icon: category.icon || "\uD83D\uDCB0"
          }));
        const incomeList = list
          .filter((category) => category.type === "income")
          .map((category) => ({
            name: category.name,
            icon: category.icon || "\uD83D\uDCB5"
          }));

        setExpenseCategories(mergeCategories(DEFAULT_EXPENSE_CATEGORIES, expenseList));
        setIncomeCategories(mergeCategories(DEFAULT_INCOME_CATEGORIES, incomeList));
      })
      .catch(() => {
        setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
        setIncomeCategories(DEFAULT_INCOME_CATEGORIES);
      });
  }, [userId]);

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

    const existingCategory = categories.find(
      (category) => category.name.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
    );
    const categoryToInsert = {
      name: selectedCategory,
      icon: existingCategory?.icon || initialCategoryIcon || (type === "income" ? "\uD83D\uDCB5" : "\uD83D\uDCB0")
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
  }, [categories, initialCategoryIcon, selectedCategory, type]);

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

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert("Enter a valid amount greater than 0.");
      return;
    }

    if (!userId) {
      alert("Please log in again before saving transactions.");
      return;
    }

    if (!selectedCategory) {
      alert("Select a category");
      return;
    }

    const selectedDateValue = toDateFromValue(selectedDate);
    const todayDateValue = toDateFromValue(TODAY_DATE_VALUE);
    if (
      !isEditMode &&
      selectedDateValue &&
      todayDateValue &&
      selectedDateValue.getTime() > todayDateValue.getTime()
    ) {
      alert("Transaction date cannot be in the future.");
      return;
    }

    const wasSaved = await Promise.resolve(
      addTransaction({
        amount: parsedAmount,
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

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setRecurringMessage("Enter a valid amount greater than 0.");
      return;
    }

    if (!userId) {
      setRecurringMessage("Please log in again before saving recurring payments.");
      return;
    }

    if (!recurringStartDate) {
      setRecurringMessage("Select a recurring payment start date.");
      return;
    }

    const recurringStartDateValue = toDateFromValue(recurringStartDate);
    const todayDateValue = toDateFromValue(TODAY_DATE_VALUE);
    if (
      recurringStartDateValue &&
      todayDateValue &&
      recurringStartDateValue.getTime() > todayDateValue.getTime()
    ) {
      setRecurringMessage("Recurring start date cannot be in the future.");
      return;
    }

    if (recurringFrequency === "Custom" && !customIntervalDays) {
      setRecurringMessage("Enter how many days should pass between recurring payments.");
      return;
    }

    const recurringEndDateValue = toDateFromValue(recurringEndDate);
    if (
      recurringEndDateValue &&
      recurringStartDateValue &&
      recurringEndDateValue.getTime() < recurringStartDateValue.getTime()
    ) {
      setRecurringMessage("End date must be the same as or after the start date.");
      return;
    }

    const wasSaved = await Promise.resolve(
      addTransaction({
        amount: parsedAmount,
        note: note || selectedCategory,
        type,
        category: selectedCategory,
        categoryIcon: selectedCategoryDetails?.icon || initialCategoryIcon || "",
        transactionDate: recurringStartDate,
        recurring: true,
        recurringFrequency,
        customIntervalDays: recurringFrequency === "Custom" ? Number(customIntervalDays) : null,
        recurringStartDate,
        recurringEndDate
      })
    );

    if (wasSaved !== false) {
      closeModal();
    }
  };

  const handleAddCategory = async (newCategory) => {
    const normalizedCategory = {
      name: typeof newCategory?.name === "string" ? newCategory.name.trim() : "",
      icon: typeof newCategory?.icon === "string" ? newCategory.icon.trim() : ""
    };

    if (!normalizedCategory.name || !normalizedCategory.icon) {
      return;
    }

    if (!userId) {
      alert("Please log in again before adding categories.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          name: normalizedCategory.name,
          type,
          icon: normalizedCategory.icon
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Unable to save category.");
      }

      const savedCategory = {
        name: result.name || normalizedCategory.name,
        icon: result.icon || normalizedCategory.icon
      };

      if (type === "income") {
        setIncomeCategories((currentCategories) =>
          mergeCategories(currentCategories, [savedCategory])
        );
      } else {
        setExpenseCategories((currentCategories) =>
          mergeCategories(currentCategories, [savedCategory])
        );
      }

      setSelectedCategory(savedCategory.name);
      setShowCategory(false);
    } catch (error) {
      alert(error.message || "Unable to save category.");
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

        <label className="amountLabel" htmlFor="transaction-amount-input">
          Amount
        </label>
        <input
          id="transaction-amount-input"
          className="amount amountInput"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(normalizeAmountInput(event.target.value))}
          placeholder="0"
          aria-label="Transaction amount"
        />
        <p className="amountHint">Tap the keypad below or type your amount.</p>

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

                {recurringFrequency === "Custom" && (
                  <>
                    <label className="inputLabel" htmlFor="custom-interval-days">
                      Repeat Every (Days)
                    </label>
                    <input
                      id="custom-interval-days"
                      className="note"
                      type="number"
                      min="1"
                      value={customIntervalDays}
                      onChange={(event) => {
                        setCustomIntervalDays(event.target.value.replace(/[^\d]/g, ""));
                        setRecurringMessage("");
                      }}
                      placeholder="Enter number of days"
                    />
                  </>
                )}

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
                        max={TODAY_DATE_VALUE}
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
                  <span className="recurringSaveIcon"><FaCheck /></span>
                  <span>Save Recurring Payment</span>
                </button>

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

                {recurringMessage && (
                  <p className="recurringFeedback recurringFeedbackError">
                    {recurringMessage}
                  </p>
                )}
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
                max={TODAY_DATE_VALUE}
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
          <button
            className="ok"
            onClick={isRecurring ? handleSaveRecurringPayment : handleSubmitTransaction}
          >
            {isRecurring ? "Save Recurring" : submitLabel}
          </button>
        </div>
      </div>

      {showCategory && (
        <Category
          closeCategory={() => setShowCategory(false)}
          addNewCategory={handleAddCategory}
        />
      )}
    </div>
  );
}

