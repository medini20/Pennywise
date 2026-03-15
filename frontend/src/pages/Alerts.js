import React from "react";

function Alerts() {

  const budget = 5000;
  const spending = 3000;
  const percent = (spending / budget) * 100;

  const alerts = [
    { id: 1, percent: 50, amount: 2500, triggered: true },
    { id: 2, percent: 75, amount: 3750, triggered: false },
    { id: 3, percent: 90, amount: 4500, triggered: false }
  ];

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>

      <h1>Alerts</h1>

      {/* Budget Card */}
      <div style={{
        background:"#1e293b",
        padding:"20px",
        borderRadius:"10px",
        color:"white",
        marginBottom:"30px"
      }}>

        <h3>Monthly Budget</h3>
        <h1>₹{budget}</h1>

        <p>Current Spending: ₹{spending}</p>

        <div style={{
          background:"#374151",
          height:"10px",
          borderRadius:"10px",
          overflow:"hidden"
        }}>
          <div style={{
            width: percent + "%",
            background:"#22c55e",
            height:"100%"
          }}></div>
        </div>

        <p style={{marginTop:"10px"}}>Remaining: ₹{budget - spending}</p>

      </div>

      {/* Alerts Section */}
      <h2>Alert Thresholds</h2>

      {alerts.map(alert => (
        <div key={alert.id} style={{
          border:"1px solid #334155",
          borderRadius:"10px",
          padding:"15px",
          marginTop:"10px"
        }}>

          <h3>{alert.percent}% Alert</h3>
          <p>Alert when spending reaches ₹{alert.amount}</p>

          {alert.triggered && (
            <span style={{
              color:"#22c55e",
              fontWeight:"bold"
            }}>
              Triggered
            </span>
          )}

        </div>
      ))}

    </div>
  );
}

export default Alerts;