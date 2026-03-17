import React, { useState } from "react";
import "./transactions.css";

export default function Transactions({closeModal}){

const [showCategory,setShowCategory] = useState(false);
const [type,setType] = useState("expense");

const categories=[
{icon:"👕",name:"Clothing"},
{icon:"🚗",name:"Car"},
{icon:"🍷",name:"Alcohol"},
{icon:"🚬",name:"Cigarettes"},
{icon:"📱",name:"Electronics"},
{icon:"✈️",name:"Travel"},
{icon:"❤️",name:"Health"},
{icon:"🐶",name:"Pets"}
];

const icons=[
"🛍","🚗","☕","🏠","❤️",
"🎮","📱","🎵","🍴","🏋️",
"🎒","💳","🎁","📺","📘",
"👕","✂️","💊","⛽","⚡"
];

return(

<div className="overlay">

<div className="modal">

<div className="modalHeader">

<span onClick={closeModal}>Cancel</span>
<h3>Add</h3>
<span>📅</span>

</div>

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

<div className="categories">

{categories.map((c,i)=>(
<div className="category" key={i}>
<div className="circle">{c.icon}</div>
<p>{c.name}</p>
</div>
))}

</div>

<div
className="addCategory"
onClick={()=>setShowCategory(true)}
>
+ Add Categories
</div>

<div className="amount">0</div>

<input
className="note"
placeholder="Enter a note..."
/>

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


{showCategory && (

<div className="overlay">

<div className="modal small">

<div className="modalHeader">

<span onClick={()=>setShowCategory(false)}>Cancel</span>

<h3>Add Category</h3>

<span onClick={()=>setShowCategory(false)}>✕</span>

</div>

<input
className="categoryName"
placeholder="Enter category name"
/>

<p className="choose">Choose Icon</p>

<div className="iconGrid">

{icons.map((icon,i)=>(
<div className="iconBox" key={i}>
{icon}
</div>
))}

</div>

<div className="buttons">

<button
className="cancel"
onClick={()=>setShowCategory(false)}
>
Cancel
</button>

<button className="add">
Add Category
</button>

</div>

</div>

</div>

)}

</div>

)

}