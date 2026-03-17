import React from "react";
import "./transactions.css";

export default function Category({ closeCategory }) {

const icons = [
"🛍","🚗","☕","🏠","❤️",
"🎮","📱","🎵","🍴","🏋️",
"🎒","💳","🎁","📺","📘",
"👕","✂️","💊","⛽","⚡"
];

return (

<div className="overlay">

<div className="modal small">

<div className="modalHeader">

<span onClick={closeCategory}>Cancel</span>
<h3>Add Category</h3>
<span onClick={closeCategory}>✕</span>

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
onClick={closeCategory}
>
Cancel
</button>

<button className="add">
Add Category
</button>

</div>

</div>

</div>

);
}