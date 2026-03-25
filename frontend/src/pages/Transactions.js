import React, { useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaRegCalendarAlt } from "react-icons/fa";
import "./transactions.css";
import Category from "./category1";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const formatDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildCalendarDays = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const days = [];

  for (let i = firstDayIndex - 1; i >= 0; i -= 1) {
    const date = new Date(year, month - 1, daysInPreviousMonth - i);
    days.push({ date, outside: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ date: new Date(year, month, day), outside: false });
  }

  while (days.length < 42) {
    const nextDay = days.length - (firstDayIndex + daysInMonth) + 1;
    const date = new Date(year, month + 1, nextDay);
    days.push({ date, outside: true });
  }

  return days;
};

export default function Transactions({ closeModal, addTransaction }) {
  const today = new Date();

  const [showCategory, setShowCategory] = useState(false);
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDate, setSelectedDate] = useState(formatDateValue(today));
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [showCalendar, setShowCalendar] = useState(false);

  const [categories, setCategories] = useState([
    { icon: "\uD83D\uDC55", name: "Clothing" },
    { icon: "\uD83D\uDE97", name: "Car" },
    { icon: "\uD83C\uDF77", name: "Alcohol" },
    { icon: "\uD83D\uDEAC", name: "Cigarettes" },
    { icon: "\uD83D\uDCF1", name: "Electronics" },
    { icon: "\u2708\uFE0F", name: "Travel" },
    { icon: "\u2764\uFE0F", name: "Health" },
    { icon: "\uD83D\uDC36", name: "Pets" }
  ]);

  const selectedCategoryDetails = categories.find(
    (category) => category.name === selectedCategory
  );

  const selectedDateObject = useMemo(
    () => new Date(`${selectedDate}T00:00:00`),
    [selectedDate]
  );

  const formattedSelectedDate = selectedDateObject.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const monthLabel = calendarMonth.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric"
  });

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

  const isSameDate = (left, right) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  const pickDate = (date) => {
    setSelectedDate(formatDateValue(date));
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setShowCalendar(false);
  };

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modalHeader">
          <span onClick={closeModal}>Cancel</span>
          <h3>Add</h3>
          <span>
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
          {categories.map((c, i) => (
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

        <div
          className="addCategory"
          onClick={() => setShowCategory(true)}
        >
          + Add Categories
        </div>

        <div className="amount">{amount || 0}</div>

        <input
          className="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter a note..."
        />

        <div className="datePickerWrap">
          <button
            className="today datePickerButton"
            onClick={() => setShowCalendar((open) => !open)}
            type="button"
          >
            <FaRegCalendarAlt />
            <span>{formattedSelectedDate}</span>
          </button>

          {showCalendar && (
            <div className="calendarPopover">
              <div className="calendarHeader">
                <button
                  type="button"
                  className="calendarNav"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                    )
                  }
                >
                  <FaChevronLeft />
                </button>

                <div className="calendarTitle">{monthLabel}</div>

                <button
                  type="button"
                  className="calendarNav"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                    )
                  }
                >
                  <FaChevronRight />
                </button>
              </div>

              <div className="calendarWeekdays">
                {WEEK_DAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="calendarGrid">
                {calendarDays.map(({ date, outside }) => {
                  const selected = isSameDate(date, selectedDateObject);
                  const currentDay = isSameDate(date, today);

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      className={[
                        "calendarDay",
                        outside ? "outsideMonth" : "",
                        selected ? "selectedDay" : "",
                        currentDay ? "todayMarker" : ""
                      ].join(" ").trim()}
                      onClick={() => pickDate(date)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="calendarFooter">
                <button
                  type="button"
                  className="calendarFooterBtn"
                  onClick={() => pickDate(today)}
                >
                  Jump to today
                </button>
                <button
                  type="button"
                  className="calendarFooterBtn"
                  onClick={() => setShowCalendar(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

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

              const newTransaction = {
                amount: Number(amount),
                note: note || selectedCategory,
                type,
                category: selectedCategory,
                categoryIcon: selectedCategoryDetails?.icon || "",
                transactionDate: selectedDate,
                date: selectedDateObject.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short"
                }),
                day: selectedDateObject.toLocaleDateString("en-GB", {
                  weekday: "long"
                })
              };

              addTransaction(newTransaction);
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
          addNewCategory={(newCat) => {
            setCategories([...categories, newCat]);
          }}
        />
      )}
    </div>
  );
}
