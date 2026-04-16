import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { saveStoredSession } from "../services/authStorage";
import useIsMobile from "../hooks/useIsMobile";
import { API_BASE_URL } from "../config/api";
import { isStrongPassword, PASSWORD_RULE_MESSAGE } from "../utils/passwordRules";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SHOW_GOOGLE_SIGNIN = false;

// Password strength calculator
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
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
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [nameStatus, setUsernameStatus] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);
  const isMobile = useIsMobile();

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
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();

      if (res.ok) {
        saveStoredSession({ user: data.user, token: data.token });
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

  // Debounced name availability check
  const checkUsername = useCallback(async (name) => {
    if (name.length < 3) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus("checking");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/check-name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.available !== "boolean") {
        setUsernameStatus(null);
        return;
      }
      setUsernameStatus(data.available ? "available" : "taken");
    } catch {
      setUsernameStatus(null);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.name) checkUsername(formData.name);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.name, checkUsername]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(""); setMessage(""); setDeliveryConfirmed(true); setLoading(true);

    if (formData.password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (!isStrongPassword(formData.password)) {
      setError(PASSWORD_RULE_MESSAGE);
      setLoading(false);
      return;
    }

    if (nameStatus === "taken") {
      setError("Username is already taken. Please choose another.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setDeliveryConfirmed(Boolean(data.deliveryConfirmed));
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
    setError(""); setMessage(""); setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
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

  const nameIndicator = () => {
    if (!formData.name || formData.name.length < 3) return null;
    if (nameStatus === "checking") return <span style={{ color: "#9ca3af", fontSize: "12px" }}>⏳ Checking...</span>;
    if (nameStatus === "available") return <span style={{ color: "#22c55e", fontSize: "12px" }}>✅ Username available</span>;
    if (nameStatus === "taken") return <span style={{ color: "#ef4444", fontSize: "12px" }}>❌ Username already taken</span>;
    return null;
  };

  return (
    <div style={{ ...styles.container, ...(isMobile ? mobileStyles.container : {}) }}>
      {/* Left Panel - Branding */}
      <div style={{ ...styles.leftPanel, ...(isMobile ? mobileStyles.leftPanel : {}) }}>
        <div style={styles.brandWrapper}>
          <img src="/pennywise-logo.jpeg" alt="Pennywise" style={{ ...styles.logo, ...(isMobile ? mobileStyles.logo : {}) }} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ ...styles.dividerLine, ...(isMobile ? mobileStyles.dividerLine : {}) }}></div>

      {/* Right Panel - Form */}
      <div style={{ ...styles.rightPanel, ...(isMobile ? mobileStyles.rightPanel : {}) }}>
        <h2 style={{ ...styles.title, ...(isMobile ? mobileStyles.title : {}) }}>{step === 1 ? "Create Account" : "Verify Email"}</h2>

        {step === 1 ? (
          <form onSubmit={handleSignup} style={{ ...styles.form, ...(isMobile ? mobileStyles.form : {}) }}>
            {error && <div style={{ ...styles.errorBanner, ...(isMobile ? mobileStyles.banner : {}) }}>{error}</div>}
            {message && (
              <div
                style={{
                  ...(deliveryConfirmed ? styles.successBanner : styles.previewBanner),
                  ...(isMobile ? mobileStyles.banner : {})
                }}
              >
                {message}
              </div>
            )}

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "6px" : "0", marginBottom: "6px" }}>
                <span style={styles.label}>Username</span>
                {nameIndicator()}
              </div>
              <input
                type="text"
                name="name"
                placeholder="Choose a name"
                value={formData.name}
                onChange={handleChange}
                style={{ ...styles.input, ...(isMobile ? mobileStyles.input : {}) }}
                required
              />
            </div>

            <div>
              <span style={styles.label}>Email</span>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                style={{ ...styles.input, ...(isMobile ? mobileStyles.input : {}) }}
                required
              />
              <p style={styles.helperText}>
                OTP will be sent to your email. Please check Spam or Promotions if needed.
              </p>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "6px" : "0", marginBottom: "6px" }}>
                <span style={styles.label}>Password</span>
                {formData.password && (
                  <span style={{ color: passwordStrength.color, fontSize: "12px", fontWeight: "600" }}>
                    {passwordStrength.label}
                  </span>
                )}
              </div>
              <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                style={{ ...styles.input, ...(isMobile ? mobileStyles.input : {}) }}
                required
              />
              {formData.password && (
                <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{
                      flex: 1, height: "4px", borderRadius: "2px",
                      background: i <= passwordStrength.score ? passwordStrength.color : "rgba(255,255,255,0.1)"
                    }}></div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
                Use 8+ characters with uppercase, lowercase, numbers, and symbols
              </p>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "6px" : "0", marginBottom: "6px" }}>
                <span style={styles.label}>Re-enter Password</span>
                {confirmPassword && formData.password !== confirmPassword && (
                  <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: "600" }}>
                    Passwords do not match
                  </span>
                )}
                {confirmPassword && formData.password && formData.password === confirmPassword && (
                  <span style={{ color: "#22c55e", fontSize: "12px", fontWeight: "600" }}>
                    ✓ Passwords match
                  </span>
                )}
              </div>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ ...styles.input, ...(isMobile ? mobileStyles.input : {}) }}
                required
              />
            </div>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                style={styles.checkbox}
              />
              <span>
                I agree to the <Link to="/terms" style={styles.inlineLink}>Terms of Service</Link> and <Link to="/privacy" style={styles.inlineLink}>Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              style={{
                ...styles.button,
                ...(isMobile ? mobileStyles.button : {}),
                opacity: !agreedToTerms || loading ? 0.5 : 1,
                cursor: !agreedToTerms || loading ? "not-allowed" : "pointer"
              }}
              disabled={!agreedToTerms || loading}
            >
              {loading ? "Creating..." : "Continue"}
            </button>

            {/* Google Sign-In */}
            {SHOW_GOOGLE_SIGNIN && GOOGLE_CLIENT_ID && (
              <>
                <div style={styles.orDivider}>
                  <div style={styles.orLine}></div>
                  <span style={styles.orText}>OR</span>
                  <div style={styles.orLine}></div>
                </div>
                <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center", width: "100%" }}></div>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ ...styles.form, ...(isMobile ? mobileStyles.form : {}) }}>
          {error && <div style={{ ...styles.errorBanner, ...(isMobile ? mobileStyles.banner : {}) }}>{error}</div>}
          {message && (
            <div
              style={{
                ...(deliveryConfirmed ? styles.successBanner : styles.previewBanner),
                ...(isMobile ? mobileStyles.banner : {})
              }}
            >
              {message}
            </div>
          )}

            <input
              type="text"
              placeholder="Enter OTP code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              style={{ ...styles.input, ...(isMobile ? mobileStyles.input : {}) }}
              required
            />

            <button type="submit" style={{ ...styles.button, ...(isMobile ? mobileStyles.button : {}) }} disabled={loading}>
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <span style={{ color: "#9ca3af", fontSize: "14px" }}>
            Already have an account?{" "}
            <Link to="/login" style={styles.link}>Sign in</Link>
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    height: "100vh",
    background: "#080c24",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: "#ffffff",
    overflow: "hidden",
  },
  leftPanel: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#080c24",
    padding: "40px",
    minHeight: "100vh",
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
    justifyContent: "flex-start",
    alignItems: "center",
    padding: "48px 40px",
    background: "#0a0e27",
    overflowY: "auto",
    minHeight: "100vh",
    boxSizing: "border-box",
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
  label: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#e5e7eb",
    display: "block",
    marginBottom: "6px",
  },
  helperText: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "8px",
    lineHeight: "1.5"
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
  errorBanner: {
    background: "rgba(239, 68, 68, 0.1)",
    borderLeft: "4px solid #ef4444",
    color: "#fca5a5",
    padding: "12px",
    borderRadius: "4px",
    fontSize: "14px",
  },
  successBanner: {
    background: "rgba(34, 197, 94, 0.1)",
    borderLeft: "4px solid #22c55e",
    color: "#86efac",
    padding: "12px",
    borderRadius: "4px",
    fontSize: "14px",
  },
  previewBanner: {
    background: "rgba(250, 204, 21, 0.08)",
    borderLeft: "4px solid #facc15",
    color: "#fde68a",
    padding: "12px",
    borderRadius: "4px",
    fontSize: "14px",
  },
  previewLabel: {
    marginBottom: "8px",
    lineHeight: "1.5",
  },
  previewCode: {
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "6px",
    color: "#ffffff",
    textAlign: "center",
  },
  orDivider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "8px 0",
  },
  orLine: {
    flex: 1,
    height: "1px",
    background: "rgba(255, 255, 255, 0.12)",
  },
  orText: {
    fontSize: "13px",
    color: "#6b7280",
    letterSpacing: "1px",
  },
  footer: {
    marginTop: "24px",
    textAlign: "center",
  },
  link: {
    color: "#00ccff",
    textDecoration: "none",
    fontWeight: "500",
  },
  inlineLink: {
    color: "#00ccff",
    textDecoration: "none",
    fontWeight: "600"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    fontSize: "13px",
    color: "#9ca3af",
    cursor: "pointer",
    lineHeight: "1.4",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    marginTop: "2px",
    accentColor: "#00ccff",
    cursor: "pointer",
    flexShrink: 0,
  },
};

const mobileStyles = {
  container: {
    flexDirection: "column",
    minHeight: "100dvh",
    height: "auto",
    overflow: "auto"
  },
  leftPanel: {
    flex: "0 0 auto",
    minHeight: "auto",
    padding: "24px 20px 8px"
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
    minHeight: "auto"
  },
  title: {
    fontSize: "30px",
    marginBottom: "22px",
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
    width: "100%"
  }
};

export default Signup;
