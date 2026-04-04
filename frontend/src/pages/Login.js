import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { hasValidSession, saveStoredSession } from "../services/authStorage";
import useIsMobile from "../hooks/useIsMobile";
import { API_BASE_URL } from "../config/api";
const API_DOWN_MESSAGE = `Cannot reach backend server (${API_BASE_URL}). Start backend with 'cd backend && npm start' or run 'start-dev.cmd'.`;

function Login() {
  const [name, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (hasValidSession()) navigate("/");
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await response.json();
      if (response.ok) {
        saveStoredSession({ user: data.user, token: data.token });
        navigate("/");
      } else {
        const details =
          typeof data.details === "string" && data.details.trim()
            ? ` (${data.details})`
            : "";
        setError((data.error || "Login failed") + details);
      }
    } catch {
      setError(API_DOWN_MESSAGE);
    }
  };

  return (
    <div style={{ ...styles.container, ...(isMobile ? mobileStyles.container : {}) }}>
      {/* Left Panel - Branding */}
      <div style={{ ...styles.leftPanel, ...(isMobile ? mobileStyles.leftPanel : {}) }}>
        <div style={styles.brandWrapper}>
          <img
            src="/pennywise-logo.jpeg"
            alt="Pennywise"
            style={{ ...styles.logo, ...(isMobile ? mobileStyles.logo : {}) }}
          />
        </div>
      </div>

      {/* Divider */}
      <div style={{ ...styles.dividerLine, ...(isMobile ? mobileStyles.dividerLine : {}) }}></div>

      {/* Right Panel - Form */}
      <div style={{ ...styles.rightPanel, ...(isMobile ? mobileStyles.rightPanel : {}) }}>
        <h2 style={{ ...styles.title, ...(isMobile ? mobileStyles.title : {}) }}>Login</h2>

        <form onSubmit={handleLogin} style={{ ...styles.form, ...(isMobile ? mobileStyles.form : {}) }}>
          {error && <div style={{ ...styles.errorBanner, ...(isMobile ? mobileStyles.errorBanner : {}) }}>{error}</div>}

          <input
            type="text"
            placeholder="Username or Email"
            value={name}
            onChange={(e) => setUsername(e.target.value)}
            style={{ ...styles.input, ...(isMobile ? mobileStyles.input : {}) }}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...styles.input, ...(isMobile ? mobileStyles.input : {}) }}
            required
          />

          <button type="submit" style={{ ...styles.button, ...(isMobile ? mobileStyles.button : {}) }}>
            Login
          </button>
        </form>

        <div style={{ ...styles.linksRow, ...(isMobile ? mobileStyles.linksRow : {}) }}>
          <Link to="/forgot-password" style={styles.link}>
            Forgot password?
          </Link>
          <Link to="/signup" style={styles.link}>
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#080c24",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: "#ffffff",
  },
  leftPanel: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#080c24",
    padding: "40px",
  },
  brandWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "420px",
    height: "420px",
    objectFit: "contain",
    mixBlendMode: "lighten",
  },
  brandName: {
    fontSize: "32px",
    fontWeight: "800",
    letterSpacing: "8px",
    color: "#ffffff",
    margin: 0,
    textAlign: "center",
  },
  dividerLine: {
    width: "1px",
    background: "linear-gradient(to bottom, transparent, rgba(0, 180, 255, 0.3), transparent)",
    alignSelf: "stretch",
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
    background: "#0a0e27",
  },
  title: {
    fontSize: "36px",
    fontWeight: "700",
    marginBottom: "40px",
    color: "#ffffff",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    width: "100%",
    maxWidth: "400px",
  },
  input: {
    padding: "14px 18px",
    borderRadius: "6px",
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    color: "#ffffff",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.3s",
  },
  button: {
    marginTop: "10px",
    padding: "14px",
    borderRadius: "6px",
    background: "linear-gradient(135deg, #0066ff, #00ccff)",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    border: "1px solid rgba(0, 180, 255, 0.5)",
    cursor: "pointer",
    boxShadow: "0 0 20px rgba(0, 150, 255, 0.4), 0 0 40px rgba(0, 150, 255, 0.15)",
    transition: "box-shadow 0.3s, transform 0.1s",
  },
  errorBanner: {
    background: "rgba(239, 68, 68, 0.1)",
    borderLeft: "4px solid #ef4444",
    color: "#fca5a5",
    padding: "12px",
    borderRadius: "4px",
    fontSize: "14px",
  },
  linksRow: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: "400px",
    marginTop: "24px",
  },
  link: {
    color: "#00ccff",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
    transition: "color 0.2s",
  },
};

const mobileStyles = {
  container: {
    flexDirection: "column",
    minHeight: "100dvh"
  },
  leftPanel: {
    flex: "0 0 auto",
    padding: "28px 20px 12px",
    minHeight: "auto"
  },
  logo: {
    width: "min(60vw, 220px)",
    height: "min(60vw, 220px)"
  },
  dividerLine: {
    width: "100%",
    height: "1px",
    background: "linear-gradient(to right, transparent, rgba(0, 180, 255, 0.3), transparent)"
  },
  rightPanel: {
    padding: "28px 18px 36px",
    justifyContent: "flex-start"
  },
  title: {
    fontSize: "30px",
    marginBottom: "24px"
  },
  form: {
    maxWidth: "100%"
  },
  input: {
    fontSize: "16px"
  },
  button: {
    width: "100%"
  },
  errorBanner: {
    width: "100%"
  },
  linksRow: {
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    maxWidth: "100%"
  }
};

export default Login;
