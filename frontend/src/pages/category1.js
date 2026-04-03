
import React, { useState } from "react";
import { createPortal } from "react-dom";

export default function Category({ closeCategory, addNewCategory }) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");

  const icons = [
    "\uD83D\uDED2", "\uD83D\uDE97", "\u2615", "\uD83C\uDFE0", "\u2764\uFE0F",
    "\uD83C\uDFAE", "\uD83D\uDCF1", "\uD83C\uDFB5", "\uD83C\uDF7D\uFE0F", "\uD83C\uDFCB\uFE0F",
    "\uD83D\uDC55", "\u2708\uFE0F", "\uD83D\uDC36", "\uD83D\uDCB0", "\u26A1",
    "\uD83C\uDF81", "\u2702\uFE0F", "\uD83D\uDCDA"
  ];

  return createPortal(
    <div className="nestedCategoryOverlay" onClick={closeCategory}>
      <div className="modal small nestedCategoryModal" onClick={(event) => event.stopPropagation()}>
        <div className="modalHeader">
          <span onClick={closeCategory}>Cancel</span>
          <h3>Add Category</h3>
          <span onClick={closeCategory}>X</span>
        </div>

        <input
          className="note"
          placeholder="Enter category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <p style={{ marginTop: "15px" }}>Choose Icon</p>

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
          <button className="cancel" onClick={closeCategory}>
            Cancel
          </button>

          <button
            className="add"
            onClick={() => {
              if (!name || !selectedIcon) return;

              addNewCategory({
                name,
                icon: selectedIcon
              });

              closeCategory();
            }}
          >
            Add Category
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
