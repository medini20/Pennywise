import React from "react";
import { Link } from "react-router-dom";
import useIsMobile from "../hooks/useIsMobile";

function TermsOfService() {
  const isMobile = useIsMobile();

  return (
    <div style={{ ...styles.page, ...(isMobile ? mobileStyles.page : {}) }}>
      <div style={{ ...styles.card, ...(isMobile ? mobileStyles.card : {}) }}>
        <div style={styles.header}>
          <Link to="/signup" style={styles.backLink}>Back to Signup</Link>
          <h1 style={{ ...styles.title, ...(isMobile ? mobileStyles.title : {}) }}>Terms of Service</h1>
          <p style={styles.subtitle}>These terms govern use of the Pennywise beta application.</p>
        </div>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Use of the Service</h2>
          <p style={styles.paragraph}>
            Pennywise is provided for educational and beta-testing purposes. You may use the service to
            record finances, budgets, alerts, and account information for testing the application features.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Account Responsibility</h2>
          <p style={styles.paragraph}>
            You are responsible for maintaining the confidentiality of your login details and for the
            activity carried out through your account. Please use accurate email access if OTP verification is required.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Beta Nature</h2>
          <p style={styles.paragraph}>
            This application may contain bugs, incomplete features, or temporary service interruptions.
            Data should be treated as test data and not relied on as official financial advice or permanent storage.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Acceptable Use</h2>
          <p style={styles.paragraph}>
            You agree not to misuse the service, attempt unauthorized access, interfere with other users,
            or upload malicious or unlawful content through the platform.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Contact</h2>
          <p style={styles.paragraph}>
            For beta-testing issues, please contact the project team or mentor associated with the Pennywise deployment.
          </p>
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#080c24",
    color: "#ffffff",
    padding: "48px 24px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif"
  },
  card: {
    maxWidth: "900px",
    margin: "0 auto",
    background: "rgba(10, 18, 48, 0.92)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "24px",
    padding: "40px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)"
  },
  header: {
    marginBottom: "28px"
  },
  backLink: {
    color: "#00ccff",
    textDecoration: "none",
    fontWeight: 600
  },
  title: {
    fontSize: "42px",
    fontWeight: 800,
    margin: "18px 0 10px"
  },
  subtitle: {
    color: "#aab3d1",
    margin: 0,
    lineHeight: 1.7
  },
  section: {
    marginTop: "24px"
  },
  sectionTitle: {
    fontSize: "22px",
    marginBottom: "10px"
  },
  paragraph: {
    margin: 0,
    color: "#d4daf0",
    lineHeight: 1.8
  }
};

const mobileStyles = {
  page: {
    padding: "20px 14px"
  },
  card: {
    padding: "22px",
    borderRadius: "18px"
  },
  title: {
    fontSize: "32px"
  }
};

export default TermsOfService;
