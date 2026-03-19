import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) navigate("/");
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("http://localhost:5001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        navigate("/");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  return (
    <div style={styles.container}>
      {/* Left Panel - Branding */}
      <div style={styles.leftPanel}>
        <div style={styles.brandWrapper}>
          <img
            src="/pennywise-logo.jpeg"
            alt="Pennywise"
            style={styles.logo}
          />
          <h1 style={styles.brandName}>PENNYWISE</h1>
        </div>
      </div>

      {/* Divider */}
      <div style={styles.dividerLine}></div>

      {/* Right Panel - Form */}
      <div style={styles.rightPanel}>
        <h2 style={styles.title}>Login</h2>

        <form onSubmit={handleLogin} style={styles.form}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          <input
            type="text"
            placeholder="Username or Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />

          <button type="submit" style={styles.button}>
            Login
          </button>
        </form>

        <div style={styles.linksRow}>
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
  },
  brandWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
  },
  logo: {
    width: "200px",
    height: "200px",
    objectFit: "contain",
    filter: "drop-shadow(0 0 30px rgba(0, 180, 255, 0.4))",
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

export default Login;
