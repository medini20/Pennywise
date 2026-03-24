
import React, { useState } from "react";

export default function Category({ closeCategory, addNewCategory }) {

  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");

  const icons = [
    "🏠", "🚗", "✈️", "🍽️", "🛒", "☕", 
    "🏥", "🎮", "📱", "👕", "⚡", "🌐", 
    "📚", "🐶", "🏋️", "🎁", "✂️", "💰"
  ];
  return (
    <div className="overlay">

      <div className="modal small">

        <div className="modalHeader">
          <span onClick={closeCategory}>Cancel</span>
          <h3>Add Category</h3>
          <span onClick={closeCategory}>✖</span>
        </div>

        <input
          className="note"
          placeholder="Enter category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <p style={{marginTop:"15px"}}>Choose Icon</p>

        <div className="iconGrid">
          {icons.map((icon,i)=>(
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

    </div>
  );
}