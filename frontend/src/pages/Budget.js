import React, { useEffect, useState } from "react";
import { FaEdit, FaTimes, FaTrash, FaUtensils } from "react-icons/fa";
import "../styles/Budget.css";
import Category from "./Category"; // Required to link the pop-up

function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = () => {
    fetch("http://localhost:5001/budget/list")
      .then((res) => res.json())
      .then((data) => setBudgets(data));
  };

  const openEdit = (budget) => {
    setSelectedBudget(budget);
    setAmount(budget.amount);
    setEditOpen(true);
  };

  const openDelete = (budget) => {
    setSelectedBudget(budget);
    setDeleteOpen(true);
  };

  const saveBudget = () => {
    fetch("http://localhost:5001/budget/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budget_id: selectedBudget.budget_id,
        amount: Number(amount),
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setEditOpen(false);
        loadBudgets();
      });
  };

  const deleteBudget = () => {
    fetch(`http://localhost:5001/budget/${selectedBudget.budget_id}`, {
      method: "DELETE",
    }).then(() => {
      setDeleteOpen(false);
      loadBudgets();
    });
  };

  const addNewCategory = (categoryData) => {
    fetch("http://localhost:5001/budget/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: 1,
        name: categoryData.name,
        icon: categoryData.icon,
        amount: categoryData.amount,
        month: 1,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setIsCategoryModalOpen(false);
        loadBudgets();
      });
  };

  return (
    <div className="budget-container">
      <h2 className="budget-title">Budget Categories</h2>

      {budgets.map((b) => {
        const spent = 0; // Hardcoded for now
        const remaining = b.amount - spent;
        const percent = (spent / b.amount) * 100;

        return (
          <div className="budget-card" key={b.budget_id}>
            <div className="card-header">
              <div className="category">
                <div className="category-icon">
                  {/* Shows your selected emoji icon */}
                  {b.icon ? b.icon : <FaUtensils />}
                </div>
                <h3>{b.name}</h3>
              </div>

              <div className="icons">
                <FaEdit onClick={() => openEdit(b)} />
                <FaTrash style={{ color: "red" }} onClick={() => openDelete(b)} />
              </div>
            </div>

            <div className="progress">
              <div className="progress-bar" style={{ width: percent + "%" }} />
            </div>

            <div className="budget-info">
              <span>Spent: ₹{spent}</span>
              <span>Budget: ₹{b.amount}</span>
              <span className="remaining">Remaining: ₹{remaining}</span>
            </div>
          </div>
        );
      })}

      <div className="add-category" onClick={() => setIsCategoryModalOpen(true)}>
        + Add New Category
      </div>

      {/* NEW CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <Category
          closeCategory={() => setIsCategoryModalOpen(false)}
          addNewCategory={addNewCategory}
        />
      )}

      {/* EDIT MODAL */}
      {editOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Budget</h2>
              <FaTimes className="close-icon" onClick={() => setEditOpen(false)} />
            </div>

            <div className="category-box">
              <div className="category-icon">{selectedBudget?.icon}</div>
              <div>
                <div>{selectedBudget?.name}</div>
                <div className="current">Current: ₹{selectedBudget?.amount}</div>
              </div>
            </div>

            <label>Category Name</label>
            <input value={selectedBudget?.name} disabled />

            <label>Monthly Budget (₹)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />

            <div className="modal-buttons">
              <button className="cancel" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button className="save" onClick={saveBudget}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Delete Category</h2>
              <FaTimes className="close-icon" onClick={() => setDeleteOpen(false)} />
            </div>

            <div className="warning">
              <p className="delete-main">
                Are you sure you want to delete
                <b> {selectedBudget?.name}</b> ?
              </p>
              <p className="delete-sub">
                This action cannot be undone. All transactions in this category will be
                permanently deleted.
              </p>
            </div>

            <div className="modal-buttons">
              <button className="cancel" onClick={() => setDeleteOpen(false)}>
                Cancel
              </button>
              <button className="delete" onClick={deleteBudget}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Budget;