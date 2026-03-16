import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../logo.svg";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify & Reset
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);

    try {
      const response = await fetch("http://localhost:5001/auth/forgot-password", {
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
      const response = await fetch("http://localhost:5001/auth/reset-password", {
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
      {/* Logo & Brand top-left */}
      <div style={styles.brandSection}>
        <img src={logo} alt="Pennywise" style={styles.logo} />
        <span style={styles.brandName}>Pennywise</span>
      </div>

      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Reset Password</h1>
          <p style={styles.subtitle}>
            {step === 1 ? "Enter your email to receive an OTP." : "Enter the OTP and your new password."}
          </p>
        </div>
        
        {error && <div style={styles.errorBanner}>{error}</div>}
        {message && <div style={styles.successBanner}>{message}</div>}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="Enter your email"
                required
              />
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Verification Code (OTP)</label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                style={styles.input}
                placeholder="Enter 6-digit code"
                maxLength="6"
                required
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                placeholder="Create new password"
                required
              />
            </div>
            <div style={styles.inputGroup}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={styles.label}>Confirm New Password</label>
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
                    : "#374151"
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
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Remember your password? <Link to="/login" style={styles.link}>Sign in</Link>
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
    gap: "12px"
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
  errorBanner: { padding: "12px", borderRadius: "4px", marginBottom: "20px", fontSize: "14px", background: "rgba(239, 68, 68, 0.1)", borderLeft: "4px solid #ef4444", color: "#fca5a5" },
  successBanner: { padding: "12px", borderRadius: "4px", marginBottom: "20px", fontSize: "14px", background: "rgba(34, 197, 94, 0.1)", borderLeft: "4px solid #22c55e", color: "#86efac" },
  footer: { marginTop: "32px", textAlign: "center" },
  footerText: { fontSize: "14px", color: "#9ca3af" },
  link: { color: "#3b82f6", textDecoration: "none", fontWeight: "500" }
};

export default ForgotPassword;
