import React, { useState } from "react";
import "./Alerts.css";

function Alerts() {

const [budget,setBudget] = useState(5000);
const spent = 3000;

const percent = ((spent/budget)*100).toFixed(1);

const [alerts,setAlerts] = useState([
{id:1,percent:50},
{id:2,percent:75},
{id:3,percent:90}
]);

const [showModal,setShowModal] = useState(false);
const [editingId,setEditingId] = useState(null);
const [value,setValue] = useState("");

function openAdd(){
setEditingId(null);
setValue("");
setShowModal(true);
}

function openEdit(alert){
setEditingId(alert.id);
setValue(alert.percent);
setShowModal(true);
}

function saveAlert(){

if(value==="") return;

if(editingId){

setAlerts(alerts.map(a =>
a.id===editingId ? {...a,percent:value} : a
));

}else{

setAlerts([
...alerts,
{id:Date.now(),percent:value}
]);

}

setShowModal(false);
}

function deleteAlert(id){
setAlerts(alerts.filter(a=>a.id!==id));
}

return(

<div className="alertsPage">

<h1 className="title">Alerts</h1>

{/* Budget Card */}

<div className="budgetCard">

<div className="budgetHeader">

<div>
<p className="label">Monthly Budget</p>
<h2>₹{budget}</h2>
<p>Current Spending: ₹{spent}</p>
</div>

<button className="editBtn"
onClick={()=>setShowModal(true)}
>
✎
</button>

</div>

<div className="progressBar">
<div
className="progress"
style={{width:`${percent}%`}}
></div>
</div>

<p className="remaining">
Remaining: ₹{budget-spent}
<span className="percent">{percent}%</span>
</p>

</div>

{/* Alert Section */}

<div className="alertContainer">

<div className="alertHeader">

<h2>Alert Thresholds</h2>

<button className="addBtn"
onClick={openAdd}
>
+ Add Alert
</button>

</div>

{alerts.map(alert => {

const triggerValue = (budget * alert.percent)/100;

return(

<div className="alertItem"
key={alert.id}
>

<div>

<h3>{alert.percent}% Alert</h3>
<p>
Alert when spending reaches ₹{triggerValue}
</p>

</div>

<div className="actions">

<button
className="edit"
onClick={()=>openEdit(alert)}
>
✏
</button>

<button
className="delete"
onClick={()=>deleteAlert(alert.id)}
>
🗑
</button>

</div>

</div>

)

})}

</div>

{/* Modal */}

{showModal && (

<div className="modalOverlay">

<div className="modal">

<h2>
{editingId ? "Edit Alert" : "Add Alert"}
</h2>

<input
type="number"
placeholder="Alert percentage"
value={value}
onChange={e=>setValue(e.target.value)}
/>

<div className="modalButtons">

<button
className="cancel"
onClick={()=>setShowModal(false)}
>
Cancel
</button>

<button
className="save"
onClick={saveAlert}
>
Save
</button>

</div>

</div>

</div>

)}

</div>

)

}

export default Alerts;