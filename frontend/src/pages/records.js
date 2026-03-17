import React, { useState } from "react";
import Transactions from "./Transactions";
import "./records.css";

export default function Records(){

const [showTransaction,setShowTransaction] = useState(false);

return(

<div className="records-page">

<div className="alert">
⚠ High Spending Alert — You've spent 60% of your monthly budget.
</div>

<div className="cards">

<div className="card expenseCard">
<div className="cardTitle">
<span className="icon expenseIcon">↘</span>
<span>Expenses</span>
</div>
<h2>₹3,000</h2>
</div>

<div className="card incomeCard">
<div className="cardTitle">
<span className="icon incomeIcon">↗</span>
<span>Income</span>
</div>
<h2>₹10,000</h2>
</div>

<div className="card balanceCard">
<div className="cardTitle">
<span className="icon balanceIcon">◎</span>
<span>Balance</span>
</div>
<h2>₹7,000</h2>
</div>

</div>

<select className="monthDropdown" size="1">

<option>Jan 2026</option>
<option>Feb 2026</option>
<option>Mar 2026</option>
<option>Apr 2026</option>
<option>May 2026</option>
<option>Jun 2026</option>
<option>Jul 2026</option>
<option>Aug 2026</option>
<option>Sep 2026</option>
<option>Oct 2026</option>
<option>Nov 2026</option>
<option>Dec 2026</option>

</select>

<div className="transactions">

<div className="transaction">
<span>26 Jan - Lunch at restaurant</span>
<span className="expenseText">₹-45</span>
</div>

<div className="transaction">
<span>26 Jan - Movie tickets</span>
<span className="expenseText">₹-120</span>
</div>

<div className="transaction">
<span>25 Jan - Fuel</span>
<span className="expenseText">₹-80</span>
</div>

</div>

<button
className="addTransaction"
onClick={()=>setShowTransaction(true)}
>
+ ADD TRANSACTION
</button>

{showTransaction && (
<Transactions closeModal={()=>setShowTransaction(false)} />
)}

</div>

)
}
