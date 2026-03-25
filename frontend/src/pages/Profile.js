import React, { useEffect, useRef, useState } from "react";
import "./Profile.css";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";
import { FaCheck, FaPen } from "react-icons/fa";
import {
  clearStoredSession,
  getStoredToken,
  updateStoredUser as syncStoredUser
} from "../services/authStorage";

const API_BASE_URL = "http://localhost:5001";

function Profile() {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const usernameInputRef = useRef(null);

  const [username, setUsername] = useState("alex_user");
  const [email, setEmail] = useState("alex.user92@gmail.com");
  const [tempUser, setTempUser] = useState("alex_user");
  const [editUser, setEditUser] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [profileImage, setProfileImage] = useState(
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
  );

  const handleLogout = () => {
    clearStoredSession();
    navigate("/login");
  };

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      clearStoredSession();
      navigate("/login");
      return;
    }

    fetch(`${API_BASE_URL}/api/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })
      .then((res) => res.json())
      .then((data) => {
        const nextUsername = data.username || "";
        const nextEmail = data.email || "";
        setUsername(nextUsername);
        setEmail(nextEmail);
        setTempUser(nextUsername);
      })
      .catch(() => {
        setStatusMessage("Unable to load profile details right now.");
      });
  }, [navigate]);

  useEffect(() => {
    if (editUser && usernameInputRef.current) {
      usernameInputRef.current.focus();
      usernameInputRef.current.select();
    }
  }, [editUser]);

  const updateSavedUser = (nextUsername) => {
    syncStoredUser({
      username: nextUsername,
      email
    });
  };

  const resetUsernameEdit = () => {
    setTempUser(username);
    setEditUser(false);
  };

  const saveUser = async () => {
    const token = getStoredToken();
    const trimmedUsername = tempUser.trim();

    if (!trimmedUsername) {
      setStatusMessage("Username is required.");
      resetUsernameEdit();
      return;
    }

    const res = await fetch(`${API_BASE_URL}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        username: trimmedUsername,
        email
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setStatusMessage(data.message || data.error || "Unable to update profile.");
      resetUsernameEdit();
      return;
    }

    setUsername(trimmedUsername);
    setTempUser(trimmedUsername);
    setEditUser(false);
    updateSavedUser(trimmedUsername);
    setStatusMessage(data.message || "Profile updated successfully");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageURL = URL.createObjectURL(file);
      setProfileImage(imageURL);
    }
  };

  return (
    <div className="profile-wrapper">
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
            <button
              onClick={() => {
                setShowOptions(false);
                setShowCamera(true);
              }}
            >
              Camera
            </button>

            <button
              onClick={() => {
                document.getElementById("galleryUpload").click();
                setShowOptions(false);
              }}
            >
              Gallery
            </button>

            <button
              onClick={() => {
                setProfileImage("https://cdn-icons-png.flaticon.com/512/3135/3135715.png");
                setShowOptions(false);
              }}
            >
              Remove Photo
            </button>

            <button onClick={() => setShowOptions(false)}>
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
        style={{ display: "none" }}
        onChange={handleImageChange}
      />

      <input
        id="galleryUpload"
        type="file"
        accept="image/*"
        style={{ display: "none" }}
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
            onClick={() => {
              const imageSrc = webcamRef.current.getScreenshot();
              setProfileImage(imageSrc);
              setShowCamera(false);
            }}
          >
            Capture
          </button>

          <button onClick={() => setShowCamera(false)}>
            Cancel
          </button>
        </div>
      )}

      {statusMessage && <div className="profile-status">{statusMessage}</div>}

      <div className="profile-card">
        <div className="profile-card-content">
          <div className="label">Username</div>
          <div className="username-row">
            {editUser ? (
              <>
                <input
                  ref={usernameInputRef}
                  className="input-box username-input"
                  value={tempUser}
                  onChange={(e) => setTempUser(e.target.value)}
                  onBlur={resetUsernameEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveUser();
                    }
                    if (e.key === "Escape") {
                      resetUsernameEdit();
                    }
                  }}
                  placeholder="Enter username"
                />
                <button
                  className="icon-btn save-icon-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={saveUser}
                  aria-label="Save username"
                >
                  <FaCheck />
                </button>
              </>
            ) : (
              <>
                <span className="value username-inline-value">{username}</span>
                <button
                  className="icon-btn edit-icon-btn"
                  onClick={() => {
                    setTempUser(username);
                    setEditUser(true);
                    setStatusMessage("");
                  }}
                  aria-label="Edit username"
                >
                  <FaPen />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-card-content">
          <div className="label">Email</div>
          <div className="value">{email}</div>
        </div>
      </div>

      <button className="logout-btn" onClick={handleLogout}>
        Log Out
      </button>
    </div>
  );
}

export default Profile;
