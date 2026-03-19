import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

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
      {/* Left Panel - Branding */}
      <div style={styles.leftPanel}>
        <div style={styles.brandWrapper}>
          <img src="/pennywise-logo.jpeg" alt="Pennywise" style={styles.logo} />
          <h1 style={styles.brandName}>PENNYWISE</h1>
        </div>
      </div>

      {/* Divider */}
      <div style={styles.dividerLine}></div>

      {/* Right Panel - Form */}
      <div style={styles.rightPanel}>
        <h2 style={styles.title}>{step === 1 ? "Create Account" : "Verify Email"}</h2>

        {step === 1 ? (
          <form onSubmit={handleSignup} style={styles.form}>
            {error && <div style={styles.errorBanner}>{error}</div>}
            {message && <div style={styles.successBanner}>{message}</div>}

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={styles.label}>Username</span>
                {usernameIndicator()}
              </div>
              <input
                type="text"
                name="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
                style={styles.input}
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
                style={styles.input}
                required
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
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
                style={styles.input}
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
                Use 6+ characters with uppercase, numbers & symbols
              </p>
            </div>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                style={styles.checkbox}
              />
              <span>
                I agree to the <span style={{ color: "#00ccff" }}>Terms of Service</span> and <span style={{ color: "#00ccff" }}>Privacy Policy</span>
              </span>
            </label>

            <button
              type="submit"
              style={{
                ...styles.button,
                opacity: !agreedToTerms || loading ? 0.5 : 1,
                cursor: !agreedToTerms || loading ? "not-allowed" : "pointer"
              }}
              disabled={!agreedToTerms || loading}
            >
              {loading ? "Creating..." : "Continue"}
            </button>

            {/* Google Sign-In */}
            <div style={styles.orDivider}>
              <div style={styles.orLine}></div>
              <span style={styles.orText}>OR</span>
              <div style={styles.orLine}></div>
            </div>

            {GOOGLE_CLIENT_ID ? (
              <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center" }}></div>
            ) : (
              <p style={{ textAlign: "center", fontSize: "12px", color: "#6b7280" }}>
                Google Sign-In not configured.
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            {error && <div style={styles.errorBanner}>{error}</div>}
            {message && <div style={styles.successBanner}>{message}</div>}

            <input
              type="text"
              placeholder="Enter OTP code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              style={styles.input}
              required
            />

            <button type="submit" style={styles.button} disabled={loading}>
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
    overflowY: "auto",
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

export default Signup;
