import React, { useState } from "react";
import "./transactions.css";
import Category from "./Category";   // 👈 import new component

export default function Transactions({ closeModal }) {

const [showCategory, setShowCategory] = useState(false);
const [type, setType] = useState("expense");

const categories = [
{icon:"👕",name:"Clothing"},
{icon:"🚗",name:"Car"},
{icon:"🍷",name:"Alcohol"},
{icon:"🚬",name:"Cigarettes"},
{icon:"📱",name:"Electronics"},
{icon:"✈️",name:"Travel"},
{icon:"❤️",name:"Health"},
{icon:"🐶",name:"Pets"}
];

return (

<div className="overlay">

<div className="modal">

{/* HEADER */}
<div className="modalHeader">
<span onClick={closeModal}>Cancel</span>
<h3>Add</h3>
<span>📅</span>
</div>

{/* SWITCH */}
<div className="switch">

<button
className={type==="expense"?"active":""}
onClick={()=>setType("expense")}
>
Expense
</button>

<button
className={type==="income"?"active":""}
onClick={()=>setType("income")}
>
Income
</button>

</div>

{/* CATEGORIES */}
<div className="categories">

{categories.map((c,i)=>(
<div className="category" key={i}>
<div className="circle">{c.icon}</div>
<p>{c.name}</p>
</div>
))}

</div>

{/* ADD CATEGORY BUTTON */}
<div
className="addCategory"
onClick={()=>setShowCategory(true)}
>
+ Add Categories
</div>

{/* AMOUNT */}
<div className="amount">0</div>

{/* NOTE */}
<input
className="note"
placeholder="Enter a note..."
/>

{/* KEYPAD */}
<div className="keypad">

<button>7</button>
<button>8</button>
<button>9</button>
<button className="today">Today</button>

<button>4</button>
<button>5</button>
<button>6</button>
<button>+</button>

<button>1</button>
<button>2</button>
<button>3</button>
<button>-</button>

<button>.</button>
<button>0</button>
<button>⌫</button>
<button className="ok">✔</button>

</div>

</div>

{/* CATEGORY MODAL */}
{showCategory && (
<Category closeCategory={() => setShowCategory(false)} />
)}

</div>

);
}