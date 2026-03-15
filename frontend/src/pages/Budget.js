import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaUtensils } from "react-icons/fa";

function Budget() {

  const [budgets, setBudgets] = useState([]);

  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const [selectedBudget, setSelectedBudget] = useState(null);
  const [newAmount, setNewAmount] = useState("");

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
    setNewAmount(budget.amount);
    setEditModal(true);
  };

  const openDelete = (budget) => {
    setSelectedBudget(budget);
    setDeleteModal(true);
  };

  const saveEdit = () => {

  fetch("http://localhost:5000/budget/edit", {

    method: "PUT",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      budget_id: selectedBudget.budget_id,
      amount: Number(newAmount)
    })

  })
  .then(res => res.json())
  .then(() => {
    setEditModal(false);
    loadBudgets();
  });

};

  const confirmDelete = () => {

    fetch(`http://localhost:5000/budget/${selectedBudget.budget_id}`, {
      method: "DELETE"
    })
      .then(() => {
        setDeleteModal(false);
        loadBudgets();
      });

  };

  return (

    <div style={{ padding: "60px", color: "white" ,maxWidth:"1200px"}}>

      <h2 style={{ marginBottom: "40px" }}>
        Budget Categories
      </h2>


      {budgets.map((b) => {

        const spent = 200;
        const remaining = b.amount - spent;
        const percent = (spent / b.amount) * 100;

        return (

          <div
            key={b.budget_id}
            style={{
              background: "#1a2c5b",
              padding: "28px",
              borderRadius: "16px",
              marginBottom: "28px",
              width: "900px"
            }}
          >

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>

              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>

                <div style={{
                  background: "#253f7d",
                  padding: "12px",
                  borderRadius: "50%"
                }}>
                  <FaUtensils />
                </div>

                <h3>{b.name}</h3>

              </div>


              <div style={{ display: "flex", gap: "18px", fontSize: "18px" }}>

                <FaEdit
                  style={{ cursor: "pointer" ,color:"white", opacity:0.8 }}
                  onClick={() => openEdit(b)}
                />

                <FaTrash
                  style={{ cursor: "pointer", color: "red" }}
                  onClick={() => openDelete(b)}
                />

              </div>

            </div>


            <div style={{
              background: "#2e4076",
              height: "8px",
              borderRadius: "6px",
              marginTop: "18px"
            }}>

              <div style={{
                width: percent + "%",
                height: "8px",
                background: "#ffd700",
                borderRadius: "6px"
              }}></div>

            </div>


            <div style={{
              marginTop: "12px",
              display: "flex",
              gap: "25px"
            }}>

              <span>Spent: ₹{spent}</span>
              <span>Budget: ₹{b.amount}</span>

              <span style={{ color: "#00ff9c" }}>
                Remaining: ₹{remaining}
              </span>

            </div>

          </div>

        );

      })}


      {/* EDIT MODAL */}

{editModal && (

<div style={overlay}>

<div style={{
background:"#1c2333",
padding:"30px",
borderRadius:"14px",
width:"420px",
color:"white",
boxShadow:"0 0 30px rgba(0,0,0,0.6)"
}}>

<div style={{display:"flex",justifyContent:"space-between",marginBottom:"15px"}}>

<h2>Edit Budget</h2>

<span
style={{cursor:"pointer",fontSize:"20px"}}
onClick={()=>setEditModal(false)}
>
✕
</span>

</div>


<div style={{
display:"flex",
alignItems:"center",
gap:"12px",
background:"#232b3f",
padding:"12px",
borderRadius:"10px",
marginBottom:"20px"
}}>

<div style={{
background:"#253f7d",
padding:"12px",
borderRadius:"50%"
}}>
<FaUtensils/>
</div>

<div>

<div style={{fontWeight:"500"}}>
{selectedBudget?.name}
</div>

<div style={{fontSize:"13px",opacity:"0.7"}}>
Current: ₹{selectedBudget?.amount}
</div>

</div>

</div>


<label>Category Name</label>

<input
value={selectedBudget?.name}
disabled
style={{
width:"100%",
padding:"12px",
marginTop:"6px",
background:"#2a3146",
border:"none",
borderRadius:"8px",
color:"white"
}}
/>


<label style={{marginTop:"12px",display:"block"}}>
Monthly Budget (₹)
</label>

<input
type="number"
value={newAmount}
onChange={(e)=>setNewAmount(e.target.value)}
style={{
width:"100%",
padding:"12px",
marginTop:"6px",
background:"#2a3146",
border:"none",
borderRadius:"8px",
color:"white"
}}
/>


<div style={{
display:"flex",
justifyContent:"space-between",
marginTop:"20px"
}}>

<button
style={{
background:"#2b2f3d",
padding:"10px 20px",
border:"none",
borderRadius:"8px",
color:"white",
cursor:"pointer"
}}
onClick={()=>setEditModal(false)}
>
Cancel
</button>

<button
style={{
background:"#20c4d8",
padding:"10px 20px",
border:"none",
borderRadius:"8px",
color:"white",
cursor:"pointer"
}}
onClick={saveEdit}
>
Save Changes
</button>

</div>

</div>

</div>

)}
      {/* DELETE MODAL */}

{deleteModal && (

<div style={overlay}>

<div style={{
background:"#1c2333",
padding:"28px",
borderRadius:"14px",
width:"420px",
color:"white",
boxShadow:"0 0 40px rgba(0,0,0,0.6)"
}}>

<div style={{display:"flex",justifyContent:"space-between"}}>

<h2>Delete Category</h2>

<span
style={{cursor:"pointer",fontSize:"20px"}}
onClick={()=>setDeleteModal(false)}
>
✕
</span>

</div>


<div style={{
background:"#3a2022",
padding:"14px",
borderRadius:"10px",
marginTop:"16px",
color:"white"
}}>

Are you sure you want to delete <b>{selectedBudget?.name}</b> ?

<br/><br/>

This action cannot be undone. All transactions in this category will be permanently deleted.

</div>


<div style={{
display:"flex",
justifyContent:"space-between",
marginTop:"22px"
}}>

<button
style={{
background:"#2b2f3d",
padding:"10px 20px",
border:"none",
borderRadius:"8px",
color:"white",
cursor:"pointer"
}}
onClick={()=>setDeleteModal(false)}
>
Cancel
</button>

<button
style={{
background:"#ff3b3b",
padding:"10px 20px",
border:"none",
borderRadius:"8px",
color:"white",
cursor:"pointer"
}}
onClick={confirmDelete}
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

const overlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const modal = {
  background: "#1c2333",
  padding: "30px",
  borderRadius: "10px",
  width: "320px"
};

const input = {
  width: "100%",
  padding: "10px",
  marginTop: "10px",
  background: "#2b3245",
  color: "white",
  border: "1px solid #444",
  borderRadius: "6px"
};

const cancelBtn = {
  padding: "8px 14px",
  background: "#444",
  color: "white",
  border: "none",
  borderRadius:"10px"
};

const saveBtn = {
  padding: "8px 14px",
  background: "#00bcd4",
  color: "white",
  border: "none",
  borderRadius:"10px"
};

const deleteBtn = {
  padding: "8px 14px",
  background: "red",
  color: "white",
  border: "none",
  borderRadius:"10px"
};

export default Budget;