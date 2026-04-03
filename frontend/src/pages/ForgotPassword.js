import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otpCode, newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        navigate("/login");
      } else {
        setError(data.error || "Password reset failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Back to Login - top right */}
      <Link to="/login" style={styles.backLink}>Back to Login</Link>

      {/* Left Panel - Branding */}
      <div style={styles.leftPanel}>
        <div style={styles.brandWrapper}>
          <img src="/pennywise-logo.jpeg" alt="Pennywise" style={styles.logo} />
        </div>
      </div>

      {/* Divider */}
      <div style={styles.dividerLine}></div>

      {/* Right Panel - Form */}
      <div style={styles.rightPanel}>
        <h2 style={styles.title}>Forgot Password</h2>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {message && <div style={styles.successBanner}>{message}</div>}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} style={styles.form}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="Email"
              required
            />

            <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                placeholder="Enter OTP"
                disabled
              />
              <button type="submit" style={styles.sendOtpBtn} disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </div>

            <button
              type="button"
              style={{ ...styles.button, opacity: 0.5, cursor: "not-allowed" }}
              disabled
            >
              Verify
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} style={styles.form}>
            <input
              type="email"
              value={email}
              style={{ ...styles.input, opacity: 0.6 }}
              disabled
            />

            <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                placeholder="Enter OTP"
                required
              />
              <span style={styles.otpSentBadge}>✓ Sent</span>
            </div>

            <div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                placeholder="New Password"
                required
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6px" }}>
                {confirmPassword.length > 0 && (
                  <span style={{ fontSize: "12px", fontWeight: "600", color: passwordsMatch ? "#22c55e" : "#ef4444" }}>
                    {passwordsMatch ? "✅ Passwords match" : "❌ Passwords don't match"}
                  </span>
                )}
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  ...styles.input,
                  borderColor: confirmPassword.length > 0
                    ? (passwordsMatch ? "#22c55e" : "#ef4444")
                    : "rgba(255, 255, 255, 0.25)"
                }}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <button
              type="submit"
              style={{
                ...styles.button,
                opacity: showMismatch ? 0.5 : 1,
                cursor: showMismatch ? "not-allowed" : "pointer"
              }}
              disabled={loading || showMismatch}
            >
              {loading ? "Resetting..." : "Verify"}
            </button>
          </form>
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
    position: "relative",
  },
  backLink: {
    position: "absolute",
    top: "24px",
    right: "32px",
    color: "#00ccff",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: 10,
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
    marginBottom: "30px",
    color: "#ffffff",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    width: "100%",
    maxWidth: "400px",
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
    boxSizing: "border-box",
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
    transition: "box-shadow 0.3s, transform 0.1s",
  },
  sendOtpBtn: {
    padding: "14px 20px",
    borderRadius: "6px",
    background: "#2f5be7",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    border: "1px solid rgba(0, 180, 255, 0.3)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 0.2s",
  },
  otpSentBadge: {
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    color: "#22c55e",
    fontSize: "14px",
    fontWeight: "600",
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
    marginBottom: "10px",
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
    marginBottom: "10px",
  },
  footer: {
    marginTop: "32px",
    textAlign: "center",
  },
  link: {
    color: "#00ccff",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "14px",
  },
};

export default ForgotPassword;
