import React, { useEffect, useRef, useState } from "react";
import "./Profile.css";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";
import { FaCheck, FaLock, FaPen, FaTimes } from "react-icons/fa";
import {
  clearStoredSession,
  getStoredUser,
  getStoredToken,
  setStoredToken,
  updateStoredUser as syncStoredUser
} from "../services/authStorage";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";
const API_DOWN_MESSAGE = `Cannot reach backend server (${API_BASE_URL}). Start backend and try again.`;
const DEFAULT_PROFILE_IMAGE = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
const PROFILE_IMAGE_KEY_PREFIX = "profile_image";
const normalizeProfileText = (value) =>
  typeof value === "string" ? value.trim() : "";
const deriveUsernameFromEmail = (email) => {
  const normalizedEmail = normalizeProfileText(email).toLowerCase();
  if (!normalizedEmail.includes("@")) {
    return "";
  }

  return normalizedEmail.split("@")[0];
};
const resolveUsername = (value, email = "") => {
  const normalizedValue = normalizeProfileText(value);
  if (normalizedValue) {
    return normalizedValue;
  }

  return deriveUsernameFromEmail(email);
};
const buildProfileImageStorageKey = (user) => {
  const userId = user?.id ?? user?.user_id;
  if (userId) {
    return `${PROFILE_IMAGE_KEY_PREFIX}:${userId}`;
  }

  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  if (email) {
    return `${PROFILE_IMAGE_KEY_PREFIX}:email:${email}`;
  }

  const username = typeof user?.username === "string" ? user.username.trim().toLowerCase() : "";
  if (username) {
    return `${PROFILE_IMAGE_KEY_PREFIX}:username:${username}`;
  }

  return `${PROFILE_IMAGE_KEY_PREFIX}:default`;
};
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
  const profileImageStorageKeyRef = useRef(
    buildProfileImageStorageKey(sessionUserRef.current)
  );

  const sessionUsername = typeof sessionUserRef.current?.username === "string"
    ? resolveUsername(sessionUserRef.current.username, sessionUserRef.current?.email)
    : resolveUsername(sessionUserRef.current?.name, sessionUserRef.current?.email);
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
  const [profileImage, setProfileImage] = useState(DEFAULT_PROFILE_IMAGE);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const updateSavedUser = (nextUsername, nextEmail) => {
    syncStoredUser({
      username: nextUsername,
      name: nextUsername,
      email: nextEmail
    });
  };

  const persistProfileImage = (nextProfileImage) => {
    const storageKey = profileImageStorageKeyRef.current;
    if (!storageKey) {
      return;
    }

    try {
      if (
        !nextProfileImage ||
        nextProfileImage === DEFAULT_PROFILE_IMAGE
      ) {
        localStorage.removeItem(storageKey);
        return;
      }

      localStorage.setItem(storageKey, nextProfileImage);
    } catch {
      setStatusMessage("Profile photo could not be saved locally.");
    }
  };

  const handleLogout = () => {
    clearStoredSession();
    navigate("/login");
  };

  useEffect(() => {
    const storageKey = profileImageStorageKeyRef.current;
    if (!storageKey) {
      return;
    }

    const savedProfileImage = localStorage.getItem(storageKey);
    if (savedProfileImage) {
      setProfileImage(savedProfileImage);
    }
  }, []);

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

        const apiEmail = normalizeProfileText(data.email);
        const apiUsername = resolveUsername(data.username || data.name, apiEmail);
        const nextEmail = apiEmail || sessionEmail;
        const nextUsername = apiUsername || resolveUsername(sessionUsername, nextEmail);

        setUsername(nextUsername);
        setEmail(nextEmail);
        setTempUser(nextUsername);
        setTempEmail(nextEmail);
        syncStoredUser({
          username: nextUsername,
          email: nextEmail
        });
        setStatusMessage("");
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

  const resetPasswordForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("");
  };

  const openPasswordReset = () => {
    resetPasswordForm();
    setShowPasswordReset(true);
    setStatusMessage("");
  };

  const closePasswordReset = (forceClose = false) => {
    if (isUpdatingPassword && !forceClose) {
      return;
    }

    setShowPasswordReset(false);
    resetPasswordForm();
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
          name: trimmedUsername,
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

      const savedUsername = resolveUsername(
        data?.user?.username || data?.user?.name || trimmedUsername,
        data?.user?.email || trimmedEmail
      );
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

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");

    const token = getStoredToken();
    if (!token) {
      clearStoredSession();
      navigate("/login");
      return;
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMessage("All password fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage("New password must be at least 8 characters long.");
      return;
    }

    if (oldPassword === newPassword) {
      setPasswordMessage("New password must be different from your current password.");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword,
          newPassword
        })
      });

      const responseText = await res.text();
      let data = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        data = {};
      }

      if (res.status === 401) {
        clearStoredSession();
        navigate("/login");
        return;
      }

      if (!res.ok) {
        if (res.status === 404 && /Cannot POST \/auth\/change-password/i.test(responseText)) {
          setPasswordMessage("Password API is not loaded. Restart backend server and try again.");
          return;
        }

        setPasswordMessage(
          sanitizeProfileMessage(
            data.message || data.error || responseText,
            "Unable to update password right now."
          )
        );
        return;
      }

      closePasswordReset(true);
      setStatusMessage("Password changed successfully.");
    } catch (error) {
      if (error?.name === "TypeError") {
        setPasswordMessage(API_DOWN_MESSAGE);
        return;
      }

      setPasswordMessage(
        sanitizeProfileMessage(error.message, "Unable to update password right now.")
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const nextImage = typeof reader.result === "string" ? reader.result : "";
        if (!nextImage) {
          setStatusMessage("Unable to load selected image.");
          return;
        }

        setProfileImage(nextImage);
        persistProfileImage(nextImage);
      };
      reader.onerror = () => {
        setStatusMessage("Unable to load selected image.");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="profile-wrapper">
      <img
        src={profileImage}
        alt="profile"
        className="profile-avatar"
      />

      <div className="profile-hero">
        <h1>{username || "Pennywise User"}</h1>
        <p>{email || "No email added"}</p>
      </div>

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
                setProfileImage(DEFAULT_PROFILE_IMAGE);
                persistProfileImage(DEFAULT_PROFILE_IMAGE);
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
              if (!imageSrc) {
                setStatusMessage("Unable to capture image. Please try again.");
                return;
              }

              setProfileImage(imageSrc);
              persistProfileImage(imageSrc);
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

      {showPasswordReset && (
        <div className="profile-popup" onMouseDown={() => closePasswordReset()}>
          <div
            className="profile-password-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="profile-password-header">
              <div className="profile-password-heading">
                <span className="profile-password-icon">
                  <FaLock />
                </span>
                <div>
                  <h3>Reset Password</h3>
                  <p>Update your account security</p>
                </div>
              </div>

              <button
                type="button"
                className="profile-password-close"
                onClick={() => closePasswordReset()}
                aria-label="Close reset password dialog"
              >
                <FaTimes />
              </button>
            </div>

            <form className="profile-password-form" onSubmit={savePassword}>
              <label className="profile-password-label" htmlFor="oldPasswordInput">
                Old Password
              </label>
              <input
                id="oldPasswordInput"
                type="password"
                className="profile-password-input"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                required
              />

              <label className="profile-password-label" htmlFor="newPasswordInput">
                New Password
              </label>
              <input
                id="newPasswordInput"
                type="password"
                className="profile-password-input"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter your new password"
                autoComplete="new-password"
                required
              />

              <label className="profile-password-label" htmlFor="confirmPasswordInput">
                Confirm New Password
              </label>
              <input
                id="confirmPasswordInput"
                type="password"
                className="profile-password-input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm your new password"
                autoComplete="new-password"
                required
              />

              {passwordMessage && (
                <div className="profile-password-status">{passwordMessage}</div>
              )}

              <button
                type="submit"
                className="change-btn profile-password-submit"
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? "Saving..." : "Save New Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {statusMessage && <div className="profile-status">{statusMessage}</div>}

      <div className="profile-card">
        <div className="profile-card-content">
          <div className="profile-section-title">Account Details</div>
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
            <span className="profile-verified-pill">Verified</span>
          </div>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-card-content">
          <div className="profile-section-title">Security</div>
          <div className="label">Security</div>
          <div className="profile-field-row">
            <span className="value profile-inline-value">Reset Password</span>
            <button
              type="button"
              className="profile-action-btn"
              onClick={openPasswordReset}
            >
              Reset
            </button>
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



