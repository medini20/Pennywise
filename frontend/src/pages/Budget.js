import React, { useEffect, useState } from "react";
import { FaEdit, FaTimes, FaTrash, FaUtensils, FaPlus, FaCar, FaShoppingCart, FaHeartbeat } from "react-icons/fa";
import "../pages/Budget.css";
import Category from "./Category"; 

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

  // Add these to your other state variables
const [isProfileOpen, setIsProfileOpen] = useState(false);
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

// Function to handle logout
const handleLogout = () => {
  console.log("Logging out...");
  // Add your logout logic here (e.g., clear localStorage, redirect)
};
  const loadBudgets = () => {
    fetch("http://localhost:5001/budget/list")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBudgets(data);
        } else if (data && Array.isArray(data.budgets)) {
          setBudgets(data.budgets);
        } else {
          setBudgets([]); 
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setBudgets([]); 
      });
  };

 const renderIcon = (iconValue, color) => {
  const style = { color: color || "#3b82f6", fontSize: "20px" };

  // If iconValue is a string like "Food", use the React Icon
  switch (iconValue) {
    case 'Food': return <FaUtensils style={style} />;
    case 'Transport': return <FaCar style={style} />;
    case 'Shopping': return <FaShoppingCart style={style} />;
    case 'Health': return <FaHeartbeat style={style} />;
    default:
      // If iconValue is an emoji (🏠, ☕, etc.), render it as text
      return <span style={{ fontSize: "22px" }}>{iconValue}</span>;
  }
};

  const openEdit = (b) => { 
    setSelectedBudget(b); 
    setAmount(b.amount); 
    setEditOpen(true); 
  };

  const openDelete = (b) => { 
    setSelectedBudget(b); 
    setDeleteOpen(true); 
  };

  const saveBudget = () => {
    fetch("http://localhost:5001/budget/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget_id: selectedBudget.budget_id, amount: Number(amount) }),
    }).then(() => { 
      setEditOpen(false); 
      loadBudgets(); 
    });
  };

  const deleteBudget = () => {
    fetch(`http://localhost:5001/budget/${selectedBudget.budget_id}`, { 
      method: "DELETE" 
    }).then(() => { 
      setDeleteOpen(false); 
      loadBudgets(); 
    });
  };

  return (
    
    <div className="budget-container">
      <h2 className="budget-title">Budget Categories</h2>

      <div className="budget-list">
        {budgets.length > 0 ? budgets.map((b) => {
          const spent = b.spent || 0; 
          const remaining = b.amount - spent;
          const percent = Math.min((spent / b.amount) * 100, 100);
          const accentColor = b.color || "#3b82f6";

          return (
            
            <div className="budget-card" key={b.budget_id}>
              <div 
                className="icon-wrapper" 
                style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
              >
                {renderIcon(b.icon || 'Food', accentColor)}
              </div>

              <div className="card-right">
                <div className="card-header-flex">
                  <h3 className="cat-name">{b.name || b.icon}</h3>
                  <div className="card-actions">
                    <FaEdit onClick={() => openEdit(b)} className="action-btn edit" />
                    <FaTrash onClick={() => openDelete(b)} className="action-btn delete" />
                  </div>
                </div>

                <div className="progress-track">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${percent}%`, 
                      backgroundColor: accentColor, 
                      boxShadow: `0 0 10px ${accentColor}60` 
                    }} 
                  />
                </div>

                <div className="stats-row">
                  <span>Spent: <span className="val">₹{spent}</span></span>
                  <span>Budget: <span className="val">₹{b.amount}</span></span>
                  <span className="remaining-val">Remaining: ₹{remaining}</span>
                </div>
              </div>
            </div>
          );
        }) : (
          <p className="empty-msg">No budgets found. Add one to start tracking!</p>
        )}

        <div className="add-card-dashed" onClick={() => setIsCategoryModalOpen(true)}>
          <div className="plus-icon-container"><FaPlus /></div>
          <span>Add New Category</span>
        </div>
      </div>

      {isCategoryModalOpen && (
        <Category 
          closeCategory={() => setIsCategoryModalOpen(false)} 
          addNewCategory={loadBudgets} 
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
              <div 
                className="icon-box-circle" 
                style={{ background: `${selectedBudget?.color}20`, padding: '10px', borderRadius: '50%' }}
              >
                {renderIcon(selectedBudget?.icon, selectedBudget?.color)}
              </div>
              <div>
                <div style={{ fontWeight: 'bold' }}>{selectedBudget?.name}</div>
                <div className="current">Current: ₹{selectedBudget?.amount}</div>
              </div>
            </div>

            <label>Monthly Budget (₹)</label>
            <input 
               className="styled-input"
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
                Are you sure you want to delete
                <b> {selectedBudget?.name}</b> ?
              </p>
              <p className="delete-sub">
                This action cannot be undone. All transactions in this category will be
                permanently deleted.
              </p>
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