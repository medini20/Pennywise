import React, { useState } from "react";

function Budget(){

const [category,setCategory]=useState("");
const [budgetAmount,setBudgetAmount]=useState("");

const [budgets,setBudgets]=useState([
{category:"Food & Dining",budget:5000,spent:1200},
{category:"Transportation",budget:3000,spent:900}
]);

function addBudget(){

if(category==="" || budgetAmount===""){
alert("Enter category and budget");
return;
}

const newBudget={
category,
budget:parseInt(budgetAmount),
spent:0
};

setBudgets([...budgets,newBudget]);

setCategory("");
setBudgetAmount("");

}

function deleteBudget(index){

const updatedBudgets=budgets.filter((_,i)=>i!==index);
setBudgets(updatedBudgets);

}

function editBudget(index){

const item=budgets[index];

setCategory(item.category);
setBudgetAmount(item.budget);

deleteBudget(index);

}

return(

<div style={{
background:"#0b1220",
minHeight:"100vh",
padding:"40px",
color:"white",
fontFamily:"Arial"
}}>

<h1 style={{marginBottom:"25px"}}>
Budget Categories
</h1>

{/* Add Budget */}

<div style={{
background:"#111827",
padding:"20px",
borderRadius:"10px",
marginBottom:"30px"
}}>

<input
type="text"
placeholder="Category"
value={category}
onChange={(e)=>setCategory(e.target.value)}
style={{
padding:"8px",
marginRight:"10px",
background:"white",
color:"black",
borderRadius:"5px",
border:"none"
}}
/>

<input
type="number"
placeholder="Budget Amount"
value={budgetAmount}
onChange={(e)=>setBudgetAmount(e.target.value)}
style={{
padding:"8px",
marginRight:"10px",
background:"white",
color:"black",
borderRadius:"5px",
border:"none"
}}
/>

<button
onClick={addBudget}
style={{
background:"#3b82f6",
border:"none",
padding:"8px 15px",
color:"white",
borderRadius:"5px",
cursor:"pointer"
}}
>
Add Budget
</button>

</div>

{/* Budget Cards */}

{budgets.map((item,index)=>{

const percent=(item.spent/item.budget)*100;
const remaining=item.budget-item.spent;

return(

<div key={index}
style={{
background:"#111827",
padding:"20px",
borderRadius:"10px",
marginBottom:"20px"
}}>

<div style={{
display:"flex",
justifyContent:"space-between",
marginBottom:"10px"
}}>

<strong>{item.category}</strong>

<div>

<button
onClick={()=>editBudget(index)}
style={{
marginRight:"10px",
background:"#facc15",
border:"none",
padding:"5px 10px",
cursor:"pointer"
}}
>
Edit
</button>

<button
onClick={()=>deleteBudget(index)}
style={{
background:"red",
border:"none",
padding:"5px 10px",
color:"white",
cursor:"pointer"
}}
>
Delete
</button>

</div>

</div>

<div style={{marginBottom:"8px"}}>

Budget ₹{item.budget} &nbsp;&nbsp;
Spent ₹{item.spent} &nbsp;&nbsp;
Remaining ₹{remaining}

</div>

{/* Progress Bar */}

<div style={{
width:"100%",
background:"#1f2937",
height:"10px",
borderRadius:"5px"
}}>

<div style={{
width:percent+"%",
height:"10px",
background:"#facc15",
borderRadius:"5px"
}}></div>

</div>

</div>

)

})}

</div>

)

}

export default Budget;