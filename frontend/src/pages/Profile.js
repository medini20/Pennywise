import React, { useEffect, useRef, useState } from "react";
import "./Profile.css";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";
import { FaCheck, FaPen } from "react-icons/fa";
import {
  clearStoredSession,
  getStoredUser,
  getStoredToken,
  setStoredToken,
  updateStoredUser as syncStoredUser
} from "../services/authStorage";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";
const API_DOWN_MESSAGE = `Cannot reach backend server (${API_BASE_URL}). Start backend and try again.`;
const sanitizeProfileMessage = (message, fallbackMessage) => {
  if (typeof message !== "string" || !message.trim()) {
    return fallbackMessage;
  }

  if (/Unknown column|where clause|SQL|ER_/i.test(message)) {
    return fallbackMessage;
  }

  return message;
};

function Profile() {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const usernameInputRef = useRef(null);
  const sessionUserRef = useRef(getStoredUser());

  const sessionUsername = typeof sessionUserRef.current?.username === "string"
    ? sessionUserRef.current.username.trim()
    : "";
  const sessionEmail = typeof sessionUserRef.current?.email === "string"
    ? sessionUserRef.current.email.trim()
    : "";

  const [username, setUsername] = useState(sessionUsername);
  const [email, setEmail] = useState(sessionEmail);
  const [tempUser, setTempUser] = useState(sessionUsername);
  const [tempEmail, setTempEmail] = useState(sessionEmail);
  const [editUser, setEditUser] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [profileImage, setProfileImage] = useState(
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
  );

  const updateSavedUser = (nextUsername, nextEmail) => {
    syncStoredUser({
      username: nextUsername,
      email: nextEmail
    });
  };

  const handleLogout = () => {
    clearStoredSession();
    navigate("/login");
  };

  useEffect(() => {
    const loadProfile = async () => {
      const token = getStoredToken();

      if (!token) {
        clearStoredSession();
        navigate("/login");
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        const data = await res.json();
        if (res.status === 401) {
          clearStoredSession();
          navigate("/login");
          return;
        }

        if (!res.ok) {
          const fallbackMessage = "Unable to load profile details right now.";
          throw new Error(
            sanitizeProfileMessage(data.message || data.error, fallbackMessage)
          );
        }

        const apiUsername = (data.username || "").trim();
        const apiEmail = (data.email || "").trim();
        const nextUsername = apiUsername || sessionUsername;
        const nextEmail = apiEmail || sessionEmail;

        setUsername(nextUsername);
        setEmail(nextEmail);
        setTempUser(nextUsername);
        setTempEmail(nextEmail);
        syncStoredUser({
          username: nextUsername,
          email: nextEmail
        });
      } catch (error) {
        if (error?.name === "TypeError") {
          setStatusMessage(API_DOWN_MESSAGE);
          return;
        }

        setStatusMessage(
          sanitizeProfileMessage(error.message, "Unable to load profile details right now.")
        );
      }
    };

    loadProfile();
  }, [navigate, sessionEmail, sessionUsername]);

  useEffect(() => {
    if (editUser && usernameInputRef.current) {
      usernameInputRef.current.focus();
      usernameInputRef.current.select();
    }
  }, [editUser]);

  const resetUsernameEdit = () => {
    setTempUser(username);
    setEditUser(false);
  };

  const saveProfile = async () => {
    const token = getStoredToken();
    const trimmedUsername = tempUser.trim();
    const trimmedEmail = tempEmail.trim().toLowerCase();

    if (!token) {
      clearStoredSession();
      navigate("/login");
      return;
    }

    if (!trimmedUsername) {
      setStatusMessage("Username is required.");
      return;
    }

    if (!trimmedEmail) {
      setStatusMessage("Email is required.");
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!isValidEmail) {
      setStatusMessage("Please enter a valid email address.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: trimmedUsername,
          email: trimmedEmail
        })
      });

      let data = {};
      try {
        data = await res.json();
      } catch (parseError) {
        data = {};
      }

      if (!res.ok) {
        setStatusMessage(
          sanitizeProfileMessage(
            data.message || data.error,
            "Unable to update profile right now."
          )
        );
        return;
      }

      const savedUsername = (data?.user?.username || trimmedUsername).trim();
      const savedEmail = (data?.user?.email || trimmedEmail).trim().toLowerCase();
      setUsername(savedUsername);
      setEmail(savedEmail);
      setTempUser(savedUsername);
      setTempEmail(savedEmail);
      setEditUser(false);
      if (data?.token) {
        setStoredToken(data.token);
      }
      updateSavedUser(savedUsername, savedEmail);
      setStatusMessage(data.message || "Profile updated successfully");
    } catch (error) {
      if (error?.name === "TypeError") {
        setStatusMessage(API_DOWN_MESSAGE);
        return;
      }

      setStatusMessage(
        sanitizeProfileMessage(error.message, "Unable to update profile right now.")
      );
    }
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
          <div className="profile-field-row">
            {editUser ? (
              <>
                <input
                  ref={usernameInputRef}
                  className="input-box profile-inline-input"
                  value={tempUser}
                  onChange={(e) => setTempUser(e.target.value)}
                  onBlur={resetUsernameEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveProfile();
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
                  onClick={saveProfile}
                  aria-label="Save username"
                >
                  <FaCheck />
                </button>
              </>
            ) : (
              <>
                <span className="value profile-inline-value">{username || "Not set"}</span>
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
          <div className="profile-field-row">
            <span className="value profile-inline-value">{email || "Not set"}</span>
          </div>
        </div>
      </div>

      <button className="logout-btn" onClick={handleLogout}>
        Log Out
      </button>
    </div>
  );
}

export default Profile;
