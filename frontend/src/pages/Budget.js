import React, { useEffect, useState } from "react";

function Budget() {

  const [budgets, setBudgets] = useState([]);

  // GET budgets from backend
  useEffect(() => {

    fetch("http://localhost:5000/budget/list")
      .then(res => res.json())
      .then(data => {
        setBudgets(data);
      });

  }, []);


  // DELETE budget
  const deleteBudget = (id) => {

    fetch(`http://localhost:5000/budget/${id}`, {
      method: "DELETE"
    })
      .then(res => res.json())
      .then(() => {

        // update UI
        setBudgets(budgets.filter(b => b.budget_id !== id));

      });

  };


  // EDIT budget
  const editBudget = (id) => {

    const newAmount = prompt("Enter new budget amount");

    if (!newAmount) return;

    fetch("http://localhost:5000/budget/edit", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        budget_id: id,
        amount: newAmount
      })
    })
      .then(res => res.json())
      .then(() => {

        // refresh budgets
        window.location.reload();

      });

  };


  return (

    <div style={{
      padding: "40px",
      background: "#0b1530",
      minHeight: "100vh",
      color: "white"
    }}>

      <h1 style={{ marginBottom: "30px" }}>
        Budget Categories
      </h1>


      {budgets.map((item) => {

        const spent = 200; // temporary value
        const budget = parseFloat(item.amount);
        const remaining = budget - spent;
        const percent = (spent / budget) * 100;

        return (

          <div
            key={item.budget_id}
            style={{
              background: "#111c44",
              padding: "20px",
              marginBottom: "20px",
              borderRadius: "12px"
            }}
          >

            <h3>
              Category ID: {item.category_id}
            </h3>


            {/* Progress Bar */}

            <div style={{
              width: "100%",
              height: "10px",
              background: "#2a356b",
              borderRadius: "6px",
              marginTop: "10px"
            }}>

              <div style={{
                width: percent + "%",
                height: "10px",
                background: "#facc15",
                borderRadius: "6px"
              }} />

            </div>


            <p style={{ marginTop: "10px" }}>
              Spent: ₹{spent}

              <span style={{ marginLeft: "20px" }}>
                Budget: ₹{budget}
              </span>

              <span style={{
                marginLeft: "20px",
                color: "#22c55e"
              }}>
                Remaining: ₹{remaining}
              </span>
            </p>


            {/* Buttons */}

            <div style={{ marginTop: "10px" }}>

              <button
                style={{
                  marginRight: "10px",
                  padding: "6px 12px"
                }}
                onClick={() => editBudget(item.budget_id)}
              >
                Edit
              </button>

              <button
                style={{
                  padding: "6px 12px",
                  background: "red",
                  color: "white"
                }}
                onClick={() => deleteBudget(item.budget_id)}
              >
                Delete
              </button>

            </div>

          </div>

        );

      })}


      {/* Add Category */}

      <div style={{
        border: "2px dashed gray",
        padding: "30px",
        textAlign: "center",
        borderRadius: "10px",
        marginTop: "30px",
        cursor: "pointer"
      }}>
        + Add New Category
      </div>

    </div>

  );

}

export default Budget;