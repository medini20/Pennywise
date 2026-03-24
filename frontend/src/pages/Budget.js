import React, { useEffect, useState } from "react";
import { FaEdit, FaTimes, FaTrash, FaUtensils, FaPlus, FaCar, FaShoppingCart, FaHeartbeat } from "react-icons/fa";
import "./Budget.css"; // Ensure path is correct
import Category from "./Category"; 

function Budget() {
  const [budgets, setBudgets] = useState([]); 
  const [selectedBudget, setSelectedBudget] = useState(null);
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  // State for Edit Modal inputs
  const [editName, setEditName] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    loadBudgets();
  }, []);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    console.log("Logging out...");
  };

  const loadBudgets = () => {
    fetch("http://localhost:5001/budget/list")
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.budgets || []);
        setBudgets(list);
      })
      .catch(err => console.log("Database offline"));
  };

  const renderIcon = (iconValue, color) => {
    const style = { color: color || "#20c4d8", fontSize: "20px" };
    switch (iconValue) {
      case 'Food': return <FaUtensils style={style} />;
      case 'Transport': return <FaCar style={style} />;
      case 'Shopping': return <FaShoppingCart style={style} />;
      case 'Health': return <FaHeartbeat style={style} />;
      default:
        return <span style={{ fontSize: "22px" }}>{iconValue}</span>;
    }
  };

  const openEdit = (b) => { 
    setSelectedBudget(b); 
    setEditName(b.name || b.icon || "");
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
      body: JSON.stringify({ 
        budget_id: selectedBudget.budget_id, 
        name: editName,
        amount: Number(amount) 
      }),
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
          const percent = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
          const accentColor = b.color || "#eab308"; // Using yellow as default progress color like Figma

          return (
            <div className="budget-card" key={b.budget_id}>
              
              {/* LEFT: ICON */}
              <div 
                className="icon-wrapper" 
                style={{ background: `${accentColor}15` }}
              >
                {renderIcon(b.icon || 'Food', accentColor)}
              </div>

              {/* RIGHT: CONTENT & STATS */}
              <div className="card-content">
                <div className="cat-name">{b.name || b.icon}</div>
                
                <div className="progress-row">
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
                  <div className="card-actions">
                    <FaEdit onClick={() => openEdit(b)} className="action-btn edit" />
                    <FaTrash onClick={() => openDelete(b)} className="action-btn delete" />
                  </div>
                </div>

                <div className="stats-row">
                  <span>Spent: <span className="val">₹{spent}</span></span>
                  <span>Budget: <span className="val">₹{b.amount}</span></span>
                  <span className="remaining-val" style={{color: '#10b981'}}>Remaining: ₹{remaining}</span>
                </div>
              </div>

            </div>
          );
        }) : (
          <p className="empty-msg">No budgets found. Add one to start tracking!</p>
        )}

        {/* Updated "Add Budget" Text */}
        <div className="add-card-dashed" onClick={() => setIsCategoryModalOpen(true)}>
          <div className="plus-icon-container"><FaPlus /></div>
          <span>Add Budget</span>
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

            <div className="category-header-box">
              <div 
                className="ch-icon" 
                style={{ background: `${selectedBudget?.color || '#20c4d8'}20` }}
              >
                {renderIcon(selectedBudget?.icon, selectedBudget?.color || '#20c4d8')}
              </div>
              <div className="ch-details">
                <h4>{selectedBudget?.name}</h4>
                <span>Current: ₹{selectedBudget?.amount}</span>
              </div>
            </div>

            <div className="input-group">
              <label>Category Name</label>
              <input 
                className="styled-input"
                type="text"
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
              />
            </div>

            <div className="input-group">
              <label>Monthly Budget (₹)</label>
              <input 
                 className="styled-input"
                 type="number"
                 value={amount} 
                 onChange={(e) => setAmount(e.target.value)} 
              />
            </div>

            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="btn-save" onClick={saveBudget}>Save Changes</button>
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

            <div className="warning-box">
              <p className="delete-main">
                Are you sure you want to delete <b>{selectedBudget?.name}</b>?
              </p>
              <p className="delete-sub">
                This action cannot be undone. All transactions in this category will be permanently deleted.
              </p>
            </div>

            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button className="btn-confirm" onClick={deleteBudget}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Budget;