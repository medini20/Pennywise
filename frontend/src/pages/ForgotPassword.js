import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useIsMobile from "../hooks/useIsMobile";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setStep(2);
      } else {
        setError(data.error || "Request failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...styles.container, ...(isMobile ? mobileStyles.container : {}) }}>
      <Link to="/login" style={{ ...styles.backLink, ...(isMobile ? mobileStyles.backLink : {}) }}>
        Back to Login
      </Link>

      <div style={{ ...styles.leftPanel, ...(isMobile ? mobileStyles.leftPanel : {}) }}>
        <div style={styles.brandWrapper}>
          <img
            src="/pennywise-logo.jpeg"
            alt="Pennywise"
            style={{ ...styles.logo, ...(isMobile ? mobileStyles.logo : {}) }}
          />
        </div>
      </div>

      <div style={{ ...styles.dividerLine, ...(isMobile ? mobileStyles.dividerLine : {}) }}></div>

      <div style={{ ...styles.rightPanel, ...(isMobile ? mobileStyles.rightPanel : {}) }}>
        <h2 style={{ ...styles.title, ...(isMobile ? mobileStyles.title : {}) }}>Forgot Password</h2>

        {error && <div style={{ ...styles.errorBanner, ...(isMobile ? mobileStyles.banner : {}) }}>{error}</div>}
        {message && <div style={{ ...styles.successBanner, ...(isMobile ? mobileStyles.banner : {}) }}>{message}</div>}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} style={{ ...styles.form, ...(isMobile ? mobileStyles.form : {}) }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...styles.input, ...(isMobile ? mobileStyles.input : {}) }}
              placeholder="Email"
              required
            />
            <p style={styles.helperText}>
              We will send a Firebase password reset link to this email.
            </p>

            <button
              type="submit"
              style={{ ...styles.button, ...(isMobile ? mobileStyles.button : {}) }}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Email"}
            </button>
          </form>
        ) : (
          <div style={{ ...styles.form, ...(isMobile ? mobileStyles.form : {}) }}>
            <div style={styles.infoCard}>
              <p style={styles.infoText}>
                We sent a password reset link to <strong>{email}</strong>.
              </p>
              <p style={styles.infoText}>
                Open the email, reset your password there, then return here and sign in.
              </p>
            </div>
            <button
              type="button"
              style={{ ...styles.button, ...(isMobile ? mobileStyles.button : {}) }}
              onClick={() => navigate("/login")}
            >
              Back to Login
            </button>
          </div>
        )}

        <div style={styles.footer}>
          <Link to="/signup" style={styles.link}>Create account</Link>
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
    position: "relative"
  },
  backLink: {
    position: "absolute",
    top: "24px",
    right: "32px",
    color: "#00ccff",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: 10
  },
  leftPanel: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#080c24",
    padding: "40px"
  },
  brandWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    width: "420px",
    height: "420px",
    objectFit: "contain",
    mixBlendMode: "lighten"
  },
  dividerLine: {
    width: "1px",
    background: "linear-gradient(to bottom, transparent, rgba(0, 180, 255, 0.3), transparent)",
    alignSelf: "stretch"
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
    background: "#0a0e27"
  },
  title: {
    fontSize: "36px",
    fontWeight: "700",
    marginBottom: "30px",
    color: "#ffffff"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    width: "100%",
    maxWidth: "400px"
  },
  input: {
    width: "100%",
    padding: "14px 18px",
    borderRadius: "6px",
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    color: "#ffffff",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.3s",
    boxSizing: "border-box"
  },
  helperText: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "-6px",
    lineHeight: "1.5"
  },
  button: {
    marginTop: "5px",
    padding: "14px",
    borderRadius: "6px",
    background: "linear-gradient(135deg, #0066ff, #00ccff)",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    border: "1px solid rgba(0, 180, 255, 0.5)",
    cursor: "pointer",
    boxShadow: "0 0 20px rgba(0, 150, 255, 0.4), 0 0 40px rgba(0, 150, 255, 0.15)",
    transition: "box-shadow 0.3s, transform 0.1s"
  },
  errorBanner: {
    background: "rgba(239, 68, 68, 0.1)",
    borderLeft: "4px solid #ef4444",
    color: "#fca5a5",
    padding: "12px",
    borderRadius: "4px",
    fontSize: "14px",
    width: "100%",
    maxWidth: "400px",
    boxSizing: "border-box",
    marginBottom: "10px"
  },
  successBanner: {
    background: "rgba(34, 197, 94, 0.1)",
    borderLeft: "4px solid #22c55e",
    color: "#86efac",
    padding: "12px",
    borderRadius: "4px",
    fontSize: "14px",
    width: "100%",
    maxWidth: "400px",
    boxSizing: "border-box",
    marginBottom: "10px"
  },
  infoCard: {
    background: "rgba(0, 204, 255, 0.08)",
    borderLeft: "4px solid #00ccff",
    color: "#bfdbfe",
    padding: "12px",
    borderRadius: "4px",
    fontSize: "14px",
    width: "100%",
    maxWidth: "400px",
    boxSizing: "border-box",
    marginBottom: "10px"
  },
  infoText: {
    marginBottom: "8px",
    lineHeight: "1.5"
  },
  footer: {
    marginTop: "32px",
    textAlign: "center"
  },
  link: {
    color: "#00ccff",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "14px"
  }
};

const mobileStyles = {
  container: {
    flexDirection: "column",
    minHeight: "100dvh"
  },
  backLink: {
    position: "static",
    display: "block",
    padding: "18px 18px 0",
    textAlign: "right"
  },
  leftPanel: {
    flex: "0 0 auto",
    padding: "12px 20px 8px",
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
    padding: "26px 18px 34px",
    justifyContent: "flex-start"
  },
  title: {
    fontSize: "30px",
    textAlign: "center"
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
  banner: {
    maxWidth: "100%"
  }
};

export default ForgotPassword;
