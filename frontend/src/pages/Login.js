import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../logo.svg";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (window.google && GOOGLE_CLIENT_ID) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "filled_black",
        size: "large",
        width: "336",
        text: "signin_with",
        shape: "rectangular",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleResponse = async (response) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5001/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/");
      } else {
        setError(data.error || "Google login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Logo & Brand top-left */}
      <div style={styles.brandSection}>
        <img src={logo} alt="Pennywise" style={styles.logo} />
        <span style={styles.brandName}>Pennywise</span>
      </div>

      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.subtitle}>Welcome back! Please login to your account.</p>
        </div>
        
        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter your username"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div style={{ textAlign: "center", marginTop: "-4px" }}>
            <Link to="/forgot-password" style={styles.forgotLink}>Forgot password?</Link>
          </div>
        </form>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine}></div>
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine}></div>
        </div>

        {/* Google Sign-In Button */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div ref={googleBtnRef}></div>
        </div>
        {!GOOGLE_CLIENT_ID && (
          <p style={{ textAlign: "center", fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>
            Google Sign-In not configured. Set REACT_APP_GOOGLE_CLIENT_ID.
          </p>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Don't have an account? <Link to="/signup" style={styles.link}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0b1220 0%, #111827 100%)",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: "#ffffff",
    position: "relative"
  },
  brandSection: {
    position: "absolute",
    top: "24px",
    left: "32px",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "12px",
    zIndex: 10
  },
  logo: {
    width: "88px",
    height: "88px",
    filter: "drop-shadow(0 0 12px rgba(59, 130, 246, 0.6))"
  },
  brandName: {
    fontSize: "36px",
    fontWeight: "700",
    color: "#e2e8f0",
    margin: 0,
    letterSpacing: "0.5px"
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "rgba(31, 41, 55, 0.7)",
    backdropFilter: "blur(10px)",
    borderRadius: "16px",
    padding: "40px 32px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.1)"
  },
  header: { textAlign: "center", marginBottom: "32px" },
  title: { fontSize: "32px", fontWeight: "bold", margin: "0 0 8px 0", color: "#3b82f6" },
  subtitle: { fontSize: "14px", color: "#9ca3af", margin: 0 },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "14px", fontWeight: "500", color: "#e5e7eb" },
  input: {
    padding: "12px 16px",
    borderRadius: "8px",
    background: "rgba(17, 24, 39, 0.8)",
    border: "1px solid #374151",
    color: "#ffffff",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.2s"
  },
  button: {
    marginTop: "8px",
    padding: "14px",
    borderRadius: "8px",
    background: "#3b82f6",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    border: "none",
    cursor: "pointer",
    transition: "background 0.2s, transform 0.1s"
  },
  errorBanner: {
    background: "rgba(239, 68, 68, 0.1)",
    borderLeft: "4px solid #ef4444",
    color: "#fca5a5",
    padding: "12px",
    borderRadius: "4px",
    marginBottom: "20px",
    fontSize: "14px"
  },
  divider: {
    display: "flex",
    alignItems: "center",
    margin: "24px 0",
    gap: "12px"
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "rgba(255, 255, 255, 0.15)"
  },
  dividerText: {
    fontSize: "13px",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "1px"
  },
  footer: { marginTop: "24px", textAlign: "center" },
  footerText: { fontSize: "14px", color: "#9ca3af" },
  link: { color: "#3b82f6", textDecoration: "none", fontWeight: "500" },
  forgotLink: { color: "#3b82f6", fontSize: "13px", textDecoration: "none" }
};

export default Login;
