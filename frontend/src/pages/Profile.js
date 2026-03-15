import { useState } from "react";
import "../App.css";

function Profile(){

const [name,setName] = useState("alex_user_92")
const [email,setEmail] = useState("alex.user92@gmail.com")

return(

<div className="profile-page">

<div className="profile-wrapper">

<img
src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
className="profile-avatar"
alt="profile"
/>

<button className="change-btn">
Change Profile
</button>

<div className="profile-card">

<div>

<p className="label">Username</p>
<p className="value">{name}</p>

</div>

<button className="edit-btn">
Edit
</button>

</div>

<div className="profile-card">

<div>

<p className="label">Email</p>
<p className="value">{email}</p>

</div>

<button className="edit-btn">
Edit
</button>

</div>

<button className="logout-btn">
Log Out
</button>

</div>

</div>

)

}

export default Profile