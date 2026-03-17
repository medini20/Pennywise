import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../logo.jpeg";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// Password strength calculator
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: "Very Weak", color: "#ef4444" },
    { label: "Weak", color: "#f97316" },
    { label: "Fair", color: "#eab308" },
    { label: "Strong", color: "#22c55e" },
    { label: "Very Strong", color: "#10b981" },
  ];
  const idx = Math.min(score, 5) - 1;
  return idx >= 0 ? { score, ...levels[idx] } : { score: 0, label: "Too Short", color: "#ef4444" };
};

function Signup() {
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  const passwordStrength = getPasswordStrength(formData.password);

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
        text: "signup_with",
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
        setError(data.error || "Google sign-up failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Debounced username availability check
  const checkUsername = useCallback(async (username) => {
    if (username.length < 3) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus("checking");
    try {
      const response = await fetch("http://localhost:5001/auth/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      setUsernameStatus(data.available ? "available" : "taken");
    } catch {
      setUsernameStatus(null);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username) checkUsername(formData.username);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username, checkUsername]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);

    if (usernameStatus === "taken") {
      setError("Username is already taken. Please choose another.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setStep(2);
      } else {
        setError(data.error || "Signup failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);

    try {
      const response = await fetch("http://localhost:5001/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, otpCode }),
      });
      const data = await response.json();

      if (response.ok) {
        navigate("/login");
      } else {
        setError(data.error || "Verification failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const usernameIndicator = () => {
    if (!formData.username || formData.username.length < 3) return null;
    if (usernameStatus === "checking") return <span style={{ color: "#9ca3af", fontSize: "12px" }}>⏳ Checking...</span>;
    if (usernameStatus === "available") return <span style={{ color: "#22c55e", fontSize: "12px" }}>✅ Username available</span>;
    if (usernameStatus === "taken") return <span style={{ color: "#ef4444", fontSize: "12px" }}>❌ Username already taken</span>;
    return null;
  };

  return (
    <div style={styles.container}>
      {/* Logo & Brand above the card */}
      <div style={styles.brandSection}>
        <img src={logo} alt="Pennywise" style={styles.logo} />
        <h2 style={styles.brandName}>Pennywise</h2>
      </div>

      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Sign Up</h1>
          <p style={styles.subtitle}>
            {step === 1 ? "Join Pennywise and take control of your finances." : "Enter the OTP sent to your email."}
          </p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {message && <div style={styles.successBanner}>{message}</div>}

        {step === 1 ? (
          <>
            <form onSubmit={handleSignup} style={styles.form}>
              <div style={styles.inputGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={styles.label}>Username</label>
                  {usernameIndicator()}
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    borderColor: usernameStatus === "taken" ? "#ef4444" : usernameStatus === "available" ? "#22c55e" : "#374151"
                  }}
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={styles.label}>Password</label>
                  {formData.password && (
                    <span style={{ color: passwordStrength.color, fontSize: "12px", fontWeight: "600" }}>
                      {passwordStrength.label}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Create a password"
                  required
                />
                {formData.password && (
                  <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        style={{
                          flex: 1,
                          height: "4px",
                          borderRadius: "2px",
                          background: passwordStrength.score >= level ? passwordStrength.color : "rgba(255,255,255,0.1)",
                          transition: "background 0.3s"
                        }}
                      />
                    ))}
                  </div>
                )}
                <p style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0 0" }}>
                  Use 6+ characters with uppercase, numbers & symbols
                </p>
              </div>

              {/* Terms checkbox */}
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={styles.checkbox}
                />
                <span>
                  I agree to the{" "}
                  <span style={{ color: "#3b82f6", cursor: "pointer" }}>Terms of Service</span>{" "}
                  and{" "}
                  <span style={{ color: "#3b82f6", cursor: "pointer" }}>Privacy Policy</span>
                </span>
              </label>

              <button
                type="submit"
                style={{
                  ...styles.button,
                  opacity: usernameStatus === "taken" || !agreedToTerms ? 0.5 : 1,
                  cursor: usernameStatus === "taken" || !agreedToTerms ? "not-allowed" : "pointer"
                }}
                disabled={loading || usernameStatus === "taken" || !agreedToTerms}
              >
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </form>

            {/* Divider */}
            <div style={styles.divider}>
              <div style={styles.dividerLine}></div>
              <span style={styles.dividerText}>or</span>
              <div style={styles.dividerLine}></div>
            </div>

            {/* Google Sign-Up Button */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div ref={googleBtnRef}></div>
            </div>
            {!GOOGLE_CLIENT_ID && (
              <p style={{ textAlign: "center", fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>
                Google Sign-In not configured. Set REACT_APP_GOOGLE_CLIENT_ID.
              </p>
            )}
          </>
        ) : (
          <form onSubmit={handleVerifyOtp} style={styles.form}>
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
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#0a0e27",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: "#ffffff",
    padding: "40px 16px",
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
    filter: "drop-shadow(0 0 12px rgba(97, 218, 251, 0.5))"
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
    background: "#0d1430",
    borderRadius: "16px",
    padding: "40px 32px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.08)"
  },
  header: { textAlign: "center", marginBottom: "32px" },
  title: { fontSize: "32px", fontWeight: "bold", margin: "0 0 8px 0", color: "#2f5be7" },
  subtitle: { fontSize: "14px", color: "#9ca3af", margin: 0 },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "14px", fontWeight: "500", color: "#e5e7eb" },
  input: {
    padding: "12px 16px",
    borderRadius: "8px",
    background: "#060d2b",
    border: "1px solid rgba(183, 193, 255, 0.2)",
    color: "#ffffff",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.3s"
  },
  button: {
    marginTop: "8px",
    padding: "14px",
    borderRadius: "8px",
    background: "#2f5be7",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    border: "none",
    cursor: "pointer",
    transition: "background 0.2s, transform 0.1s"
  },
  errorBanner: { padding: "12px", borderRadius: "4px", marginBottom: "20px", fontSize: "14px", background: "rgba(239, 68, 68, 0.1)", borderLeft: "4px solid #ef4444", color: "#fca5a5" },
  successBanner: { padding: "12px", borderRadius: "4px", marginBottom: "20px", fontSize: "14px", background: "rgba(34, 197, 94, 0.1)", borderLeft: "4px solid #22c55e", color: "#86efac" },
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
  link: { color: "#61dafb", textDecoration: "none", fontWeight: "500" },
  checkboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    fontSize: "13px",
    color: "#9ca3af",
    cursor: "pointer",
    lineHeight: "1.4"
  },
  checkbox: {
    width: "18px",
    height: "18px",
    marginTop: "2px",
    accentColor: "#2f5be7",
    cursor: "pointer",
    flexShrink: 0
  }
};

export default Signup;
