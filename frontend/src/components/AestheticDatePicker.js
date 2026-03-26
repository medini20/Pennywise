import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatAsDateValue, formatDisplayDate } from "../utils/budgetDates";
import "./AestheticDatePicker.css";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const parseDateValue = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const isOutsideRange = (dateValue, min, max) => {
  if (min && dateValue < min) {
    return true;
  }

  if (max && dateValue > max) {
    return true;
  }

  return false;
};

export default function AestheticDatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
  align = "left"
}) {
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const selectedDate = parseDateValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const today = new Date();
    const initialDate = selectedDate || today;
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    const nextSelectedDate = parseDateValue(value);
    const baseDate = nextSelectedDate || new Date();
    setViewDate(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
  }, [value]);

  const calendarDays = useMemo(() => {
    const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstGridDate = new Date(monthStart);
    firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());
    const todayValue = formatAsDateValue(new Date());

    return Array.from({ length: 42 }, (_, index) => {
      const dayDate = new Date(firstGridDate);
      dayDate.setDate(firstGridDate.getDate() + index);

      const dayValue = formatAsDateValue(dayDate);
      const isCurrentMonth = dayDate.getMonth() === viewDate.getMonth();
      const isSelected = dayValue === value;
      const isToday = dayValue === todayValue;
      const isDisabled = isOutsideRange(dayValue, min, max);

      return {
        dayValue,
        label: dayDate.getDate(),
        isCurrentMonth,
        isSelected,
        isToday,
        isDisabled
      };
    });
  }, [max, min, value, viewDate]);

  const handleSelectDate = (nextValue) => {
    if (isOutsideRange(nextValue, min, max)) {
      return;
    }

    onChange(nextValue);
    setIsOpen(false);
  };

  const selectedLabel = value ? formatDisplayDate(value) : placeholder;
  const monthLabel = viewDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });

  return (
    <div className="pwDatePicker">
      <button
        ref={triggerRef}
        type="button"
        className={`pwDatePickerTrigger ${isOpen ? "pwDatePickerTriggerOpen" : ""}`}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className="pwDatePickerTriggerCopy">
          <span className={`pwDatePickerValue ${value ? "" : "pwDatePickerValuePlaceholder"}`}>
            {selectedLabel}
          </span>
        </span>
        <CalendarDays size={18} />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`pwDatePickerPopover ${
            align === "right" ? "pwDatePickerPopoverRight" : ""
          }`}
        >
          <div className="pwDatePickerHeader">
            <button
              type="button"
              className="pwDatePickerNav"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                )
              }
            >
              <ChevronLeft size={16} />
            </button>

            <strong>{monthLabel}</strong>

            <button
              type="button"
              className="pwDatePickerNav"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                )
              }
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="pwDatePickerWeekdays">
            {WEEK_DAYS.map((dayLabel) => (
              <span key={dayLabel}>{dayLabel}</span>
            ))}
          </div>

          <div className="pwDatePickerGrid">
            {calendarDays.map((day) => (
              <button
                key={day.dayValue}
                type="button"
                className={[
                  "pwDatePickerDay",
                  day.isCurrentMonth ? "" : "pwDatePickerDayMuted",
                  day.isSelected ? "pwDatePickerDaySelected" : "",
                  day.isToday ? "pwDatePickerDayToday" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleSelectDate(day.dayValue)}
                disabled={day.isDisabled}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div className="pwDatePickerFooter">
            <button
              type="button"
              className="pwDatePickerFooterButton"
              onClick={() => {
                const todayValue = formatAsDateValue(new Date());
                if (!isOutsideRange(todayValue, min, max)) {
                  handleSelectDate(todayValue);
                }
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
