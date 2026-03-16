import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaUtensils } from "react-icons/fa";
import "../styles/Budget.css";

function Budget() {

  const [budgets, setBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [amount, setAmount] = useState("");

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = () => {

    fetch("http://localhost:5000/budget/list")
      .then(res => res.json())
      .then(data => setBudgets(data));

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

    fetch("http://localhost:5000/budget/edit", {

      method: "PUT",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        budget_id: selectedBudget.budget_id,
        amount: Number(amount)
      })

    })
      .then(res => res.json())
      .then(() => {

        setEditOpen(false);
        loadBudgets();

      });

  };

  const deleteBudget = () => {

    fetch(`http://localhost:5000/budget/${selectedBudget.budget_id}`, {
      method: "DELETE"
    })
      .then(() => {

        setDeleteOpen(false);
        loadBudgets();

      });

  };

  const addBudget = () => {

  const category_id = prompt("Enter Category ID");
  const amount = prompt("Enter Budget Amount");

  fetch("http://localhost:5000/budget/add", {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      user_id: 1,
      category_id: category_id,
      amount: amount,
      month: 1
    })

  })
  .then(res => res.json())
  .then(() => loadBudgets());

};
<div className="add-category" onClick={addBudget}>
  + Add New Category
</div>

  return (
    

<div className="budget-container">

<h2 className="budget-title">Budget Categories</h2>


{budgets.map((b) => {

const spent = 200;
const remaining = b.amount - spent;
const percent = (spent / b.amount) * 100;

return (

<div className="budget-card" key={b.budget_id}>

<div className="card-header">

<div className="category">

<div className="category-icon">
<FaUtensils />
</div>

<h3>{b.name}</h3>

</div>


<div className="icons">

<FaEdit onClick={() => openEdit(b)} />

<FaTrash
style={{color:"red"}}
onClick={() => openDelete(b)}
/>

</div>

</div>


<div className="progress">

<div
className="progress-bar"
style={{ width: percent + "%" }}
/>

</div>


<div className="budget-info">

<span>Spent: ₹{spent}</span>

<span>Budget: ₹{b.amount}</span>

<span className="remaining">
Remaining: ₹{remaining}
</span>

</div>

</div>

);

})}

<div className="add-category" onClick={addBudget}>
  + Add New Category
</div>

{/* EDIT MODAL */}

{editOpen && (

<div className="modal-overlay">

<div className="modal">

<h2>Edit Budget</h2>

<div className="category-box">

<div className="category-icon">
<FaUtensils />
</div>

<div>

<div>{selectedBudget?.name}</div>

<div className="current">
Current: ₹{selectedBudget?.amount}
</div>

</div>

</div>


<label>Category Name</label>

<input
value={selectedBudget?.name}
disabled
/>


<label>Monthly Budget (₹)</label>

<input
value={amount}
onChange={(e)=>setAmount(e.target.value)}
/>


<div className="modal-buttons">

<button
className="cancel"
onClick={()=>setEditOpen(false)}
>
Cancel
</button>

<button
className="save"
onClick={saveBudget}
>
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

<h2>Delete Category</h2>

<div className="warning">

<h1>Are you sure you want to delete
<b> {selectedBudget?.name}</b> ?</h1>

<br/><br/>

This action cannot be undone. All transactions in this category will be permanently deleted.


</div>


<div className="modal-buttons">

<button
className="cancel"
onClick={()=>setDeleteOpen(false)}
>
Cancel
</button>

<button
className="delete"
onClick={deleteBudget}
>
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
// This action cannot be undone. All transactions in this category will be permanently deleted.
