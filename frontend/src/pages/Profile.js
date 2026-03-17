import React, { useState, useRef } from "react";
import "./Profile.css";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";
function Profile() {
const navigate = useNavigate();
const handleLogout = () => {
  navigate("/login");
};
  const [username, setUsername] = useState("alex_usakshithaakshitha");
  const [email, setEmail] = useState("alex.user92@gmail.com");
const webcamRef = useRef(null);
  const [editUser, setEditUser] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
const [showCamera, setShowCamera] = useState(false);
  const [tempUser, setTempUser] = useState(username);
  const [tempEmail, setTempEmail] = useState(email);
const [showOptions, setShowOptions] = useState(false);
  const [profileImage, setProfileImage] = useState(
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
  );

  /* CHANGE PROFILE IMAGE */

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageURL = URL.createObjectURL(file);
      setProfileImage(imageURL);
    }
  };


  /* USERNAME EDIT */

  const handleEditUser = () => {
    setTempUser(username);
    setEditUser(true);
  };

  const saveUser = () => {
    setUsername(tempUser);
    setEditUser(false);
  };


  /* EMAIL EDIT */

  const handleEditEmail = () => {
    setTempEmail(email);
    setEditEmail(true);
  };

  const saveEmail = () => {
    setEmail(tempEmail);
    setEditEmail(false);
  };


  return (
    <div className="profile-wrapper">

      {/* PROFILE IMAGE */}

      <img
        src={profileImage}
        alt="profile"
        className="profile-avatar"
      />

      <button
className="change-btn"
onClick={() => setShowOptions(true)}
>
Change Profile
</button>
{showOptions && (

<div className="profile-popup">

<div className="popup-box">

<button onClick={()=>{
setShowOptions(false);
setShowCamera(true);
}}>
📷 Camera
</button>

<button
onClick={()=>{
document.getElementById("galleryUpload").click();
setShowOptions(false);
}}
>
🖼 Gallery
</button>

<button
onClick={()=>{
setProfileImage("https://cdn-icons-png.flaticon.com/512/3135/3135715.png");
setShowOptions(false);
}}
>
❌ Remove Photo
</button>

<button
onClick={()=>setShowOptions(false)}
>
Cancel
</button>

</div>

</div>

)}
<input
id="cameraUpload"
type="file"
accept="image/*"
capture="environment"
style={{display:"none"}}
onChange={handleImageChange}
/>

<input
id="galleryUpload"
type="file"
accept="image/*"
style={{display:"none"}}
onChange={handleImageChange}
/>
{showCamera && (
<div className="camera-modal">

<Webcam
screenshotFormat="image/jpeg"
width={350}
height={300}
ref={webcamRef}
/>

<button
onClick={()=>{
const imageSrc = webcamRef.current.getScreenshot();
setProfileImage(imageSrc);
setShowCamera(false);
}}
>
Capture
</button>

<button onClick={()=>setShowCamera(false)}>
Cancel
</button>

</div>
)}
    


      {/* USERNAME */}

      <div className="profile-card">

        <div>
          <div className="label">Username</div>

          {editUser ? (
            <input
              className="input-box"
              value={tempUser}
              onChange={(e) => setTempUser(e.target.value)}
            />
          ) : (
            <div className="value">{username}</div>
          )}

        </div>

        {editUser ? (
          <button className="edit-btn" onClick={saveUser}>
            Save
          </button>
        ) : (
          <button className="edit-btn" onClick={handleEditUser}>
            Edit
          </button>
        )}

      </div>


      {/* EMAIL */}

      <div className="profile-card">

        <div>
          <div className="label">Email</div>

          {editEmail ? (
            <input
              className="input-box"
              value={tempEmail}
              onChange={(e) => setTempEmail(e.target.value)}
            />
          ) : (
            <div className="value">{email}</div>
          )}

        </div>

        {editEmail ? (
          <button className="edit-btn" onClick={saveEmail}>
            Save
          </button>
        ) : (
          <button className="edit-btn" onClick={handleEditEmail}>
            Edit
          </button>
        )}

      </div>


     <button className="logout-btn" onClick={handleLogout}>
  Log Out
</button>

    </div>
  );
}

export default Profile;