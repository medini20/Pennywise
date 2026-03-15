import React, { useState } from "react";
import "../App.css";

function Profile() {

  const [profile, setProfile] = useState({
    name: "alex_user_92",
    email: "alex.user92@gmail.com"
  });

  const [editField, setEditField] = useState(null);
  const [tempValue, setTempValue] = useState("");

  const startEdit = (field) => {
    setEditField(field);
    setTempValue(profile[field]);
  };

  const saveEdit = () => {
    setProfile({
      ...profile,
      [editField]: tempValue
    });

    setEditField(null);
  };

  return (
    <div className="profile-wrapper">

      <div className="profile-container">

        <img
          src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
          className="profile-avatar"
          alt="avatar"
        />

        <button className="change-profile-btn">
          Change Profile
        </button>


        {/* USERNAME CARD */}

        <div className="profile-card">

          <div>
            <p className="profile-label">Username</p>

            {editField === "name" ? (
              <input
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
              />
            ) : (
              <p className="profile-value">{profile.name}</p>
            )}

          </div>

          {editField === "name" ? (
            <button className="edit-btn" onClick={saveEdit}>
              Save
            </button>
          ) : (
            <button className="edit-btn" onClick={() => startEdit("name")}>
              Edit
            </button>
          )}

        </div>


        {/* EMAIL CARD */}

        <div className="profile-card">

          <div>
            <p className="profile-label">Email</p>

            {editField === "email" ? (
              <input
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
              />
            ) : (
              <p className="profile-value">{profile.email}</p>
            )}

          </div>

          {editField === "email" ? (
            <button className="edit-btn" onClick={saveEdit}>
              Save
            </button>
          ) : (
            <button className="edit-btn" onClick={() => startEdit("email")}>
              Edit
            </button>
          )}

        </div>

        <button className="logout-btn">
          Log Out
        </button>

      </div>

    </div>
  );
}

export default Profile;