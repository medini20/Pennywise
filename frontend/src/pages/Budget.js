import React, { useEffect, useState } from "react";
import { FaEdit, FaTimes, FaTrash, FaUtensils } from "react-icons/fa";
import "../styles/Budget.css";
import Category from "./Category"; 

function Budget() {
  const [budgets, setBudgets] = useState([]); // Initialized as empty array
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
      .then((data) => {
        // Fix for "map is not a function": Only set state if data is an array
        setBudgets(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setBudgets([]); 
      });
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
      .then(() => {
        setIsCategoryModalOpen(false);
        loadBudgets();
      });
  };

  return (
    <div className="budget-container">
      <h2 className="budget-title">Budget Categories</h2>

      {/* Check if budgets exist before mapping */}
      <div className="budget-list">
        {budgets.length > 0 ? (
          budgets.map((b) => {
            const spent = 0; 
            const remaining = b.amount - spent;
            const percent = Math.min((spent / b.amount) * 100, 100);

            return (
              <div className="budget-card" key={b.budget_id}>
                <div className="card-header">
                  <div className="category">
                    <div className="category-icon">
                      {b.icon ? b.icon : <FaUtensils />}
                    </div>
                    {/* Fallback to icon name if name column is empty */}
                    <h3>{b.name || b.icon || "New Category"}</h3>
                  </div>

                  <div className="icons">
                    <FaEdit onClick={() => openEdit(b)} style={{ cursor: "pointer" }} />
                    <FaTrash 
                      style={{ color: "red", cursor: "pointer" }} 
                      onClick={() => openDelete(b)} 
                    />
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
          })
        ) : (
          <p className="no-data">No budget categories found. Add one to get started!</p>
        )}
      </div>

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
                <div>{selectedBudget?.name || selectedBudget?.icon}</div>
                <div className="current">Current: ₹{selectedBudget?.amount}</div>
              </div>
            </div>
            <label>Monthly Budget (₹)</label>
            <input 
              type="number"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
            />
            <div className="modal-buttons">
              <button className="cancel" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="save" onClick={saveBudget}>Save Changes</button>
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
                Are you sure you want to delete <b>{selectedBudget?.name || selectedBudget?.icon}</b>?
              </p>
              <p className="delete-sub">This action cannot be undone.</p>
            </div>
            <div className="modal-buttons">
              <button className="cancel" onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button className="delete" onClick={deleteBudget}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Budget;