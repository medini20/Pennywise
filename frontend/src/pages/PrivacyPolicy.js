import React from "react";
import { Link } from "react-router-dom";
import useIsMobile from "../hooks/useIsMobile";

function PrivacyPolicy() {
  const isMobile = useIsMobile();

  return (
    <div style={{ ...styles.page, ...(isMobile ? mobileStyles.page : {}) }}>
      <div style={{ ...styles.card, ...(isMobile ? mobileStyles.card : {}) }}>
        <div style={styles.header}>
          <Link to="/signup" style={styles.backLink}>Back to Signup</Link>
          <h1 style={{ ...styles.title, ...(isMobile ? mobileStyles.title : {}) }}>Privacy Policy</h1>
          <p style={styles.subtitle}>This policy explains how Pennywise handles user information during beta testing.</p>
        </div>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Information Collected</h2>
          <p style={styles.paragraph}>
            Pennywise may collect account details such as username, email address, authentication data,
            budgets, transactions, and profile information that you enter while using the service.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>How Data Is Used</h2>
          <p style={styles.paragraph}>
            The collected information is used to provide login access, OTP verification, budgeting features,
            analytics, alerts, and profile management within the application.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Email Verification</h2>
          <p style={styles.paragraph}>
            Email addresses may be used to send OTP verification or password reset codes. Delivery time can vary
            depending on the recipient mailbox provider.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Data Protection</h2>
          <p style={styles.paragraph}>
            Reasonable effort is made to protect stored information, but because this is a beta deployment,
            users should avoid storing highly sensitive or critical personal financial records.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Beta Testing Notice</h2>
          <p style={styles.paragraph}>
            Data entered into Pennywise may be used only for testing and evaluation of the project.
            The service may be updated, restarted, or reset during the beta period.
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

export default PrivacyPolicy;
