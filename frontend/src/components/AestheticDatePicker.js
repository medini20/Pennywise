import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatAsDateValue,
  formatDisplayDate,
  normalizeBudgetDateValue,
  parseBudgetDateValue
} from "../utils/budgetDates";
import "./AestheticDatePicker.css";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const parseDateValue = (value) => {
  return parseBudgetDateValue(value);
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
  const normalizedValue = normalizeBudgetDateValue(value);
  const normalizedMin = normalizeBudgetDateValue(min);
  const normalizedMax = normalizeBudgetDateValue(max);
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({});
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

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return;
    }

    const updatePopoverPosition = () => {
      if (!triggerRef.current) {
        return;
      }

      const rect = triggerRef.current.getBoundingClientRect();
      const estimatedWidth = Math.min(280, window.innerWidth - 24);
      const estimatedHeight = 300;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

      let left = align === "right" ? rect.right - estimatedWidth : rect.left;
      left = Math.max(12, Math.min(left, window.innerWidth - estimatedWidth - 12));

      setPopoverStyle({
        position: "fixed",
        top: openAbove ? Math.max(12, rect.top - estimatedHeight - 8) : Math.min(rect.bottom + 8, window.innerHeight - estimatedHeight - 12),
        left,
        width: estimatedWidth
      });
    };

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [align, isOpen]);

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
      const isSelected = dayValue === normalizedValue;
      const isToday = dayValue === todayValue;
      const isDisabled = isOutsideRange(dayValue, normalizedMin, normalizedMax);

      return {
        dayValue,
        label: dayDate.getDate(),
        isCurrentMonth,
        isSelected,
        isToday,
        isDisabled
      };
    });
  }, [normalizedMax, normalizedMin, normalizedValue, viewDate]);

  const handleSelectDate = (nextValue) => {
    if (isOutsideRange(nextValue, normalizedMin, normalizedMax)) {
      return;
    }

    onChange(nextValue);
    setIsOpen(false);
  };

  const selectedLabel = normalizedValue ? formatDisplayDate(normalizedValue) : placeholder;
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

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="pwDatePickerPopover"
          style={popoverStyle}
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
                if (!isOutsideRange(todayValue, normalizedMin, normalizedMax)) {
                  handleSelectDate(todayValue);
                }
              }}
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
