const nodemailer = require("nodemailer");
require("dotenv").config({ quiet: true });

let transporter = null;
let etherealAccount = null;

const normalizeEnvValue = (value) =>
  typeof value === "string" ? value.trim() : "";

const isPlaceholderEmailConfig = (emailUser, emailPass) => {
  const normalizedUser = normalizeEnvValue(emailUser).toLowerCase();
  const normalizedPass = normalizeEnvValue(emailPass).toLowerCase();

  if (!normalizedUser || !normalizedPass) {
    return true;
  }

  const placeholderTokens = [
    "your_email@gmail.com",
    "your_email_app_password",
    "donotreply.pennywise@gmail.com",
    "change_me",
    "example"
  ];

  return (
    placeholderTokens.includes(normalizedUser) ||
    placeholderTokens.includes(normalizedPass) ||
    normalizedUser.startsWith("your_") ||
    normalizedPass.startsWith("your_")
  );
};

const isEmailPreviewMode = () => {
  const emailUser = normalizeEnvValue(process.env.EMAIL_USER);
  const emailPass = normalizeEnvValue(process.env.EMAIL_PASS);
  return isPlaceholderEmailConfig(emailUser, emailPass);
};

const getTransporter = async () => {
  if (transporter) {
    return transporter;
  }

  const emailUser = normalizeEnvValue(process.env.EMAIL_USER);
  const emailPass = normalizeEnvValue(process.env.EMAIL_PASS);

  if (!isPlaceholderEmailConfig(emailUser, emailPass)) {
    try {
      const gmailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });

      await gmailTransporter.verify();
      transporter = gmailTransporter;
      return transporter;
    } catch (error) {
      console.warn("Gmail SMTP failed:", error.message);
    }
  } else {
    console.log("Email credentials are not configured. Email preview mode will be used.");
  }

  try {
    etherealAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass
      }
    });
    console.log("Email preview transport ready.");
    return transporter;
  } catch (error) {
    console.error("Ethereal setup failed:", error.message);
    return null;
  }
};

exports.sendOTP = async (email, otp) => {
  const mailTransporter = await getTransporter();
  if (!mailTransporter) {
    console.log("No email transporter available.");
    return false;
  }

  const fromAddress = etherealAccount
    ? etherealAccount.user
    : process.env.EMAIL_USER;

  const mailOptions = {
    from: `"Pennywise" <${fromAddress}>`,
    to: email,
    subject: "Pennywise - Your OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #0066ff;">Pennywise</h2>
        <p>Your OTP code is:</p>
        <div style="background: #f0f4ff; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0066ff;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes.</p>
      </div>
    `
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
      console.log("Email preview created successfully.");
    } else {
      console.log(`Email sent to ${email}`);
    }

    return true;
  } catch (error) {
    console.error("Email send failed:", error.message);
    return false;
  }
};

exports.sendBudgetAlert = async (email, data) => {
  const { budgetAmount, currentSpending, triggeredAlerts } = data;
  const triggeredThresholds = triggeredAlerts
    .map((alert) =>
      alert.scope === "category"
        ? `${alert.budget_name}: ${alert.percentage}%`
        : `${alert.percentage}%`
    )
    .join(", ");

  const mailTransporter = await getTransporter();
  if (!mailTransporter) {
    return false;
  }

  const fromAddress = etherealAccount
    ? etherealAccount.user
    : process.env.EMAIL_USER;

  const mailOptions = {
    from: `"Pennywise" <${fromAddress}>`,
    to: email,
    subject: "Pennywise - Budget Alert Triggered",
    text: `Your spending has reached ${currentSpending} out of ${budgetAmount}. Triggered thresholds: ${triggeredThresholds}.`
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("Budget alert preview created successfully.");
    }
    return true;
  } catch (error) {
    console.error("Budget alert email failed:", error.message);
    return false;
  }
};

exports.isEmailPreviewMode = isEmailPreviewMode;
