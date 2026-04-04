const nodemailer = require("nodemailer");
require("dotenv").config({ quiet: true });

let transporter = null;
let etherealAccount = null;
const EMAIL_RETRY_DELAY_MS = 1500;
const RESEND_API_URL = "https://api.resend.com/emails";
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

const normalizeEnvValue = (value) =>
  typeof value === "string" ? value.trim() : "";

const getResendApiKey = () => normalizeEnvValue(process.env.RESEND_API_KEY);
const getResendFromAddress = () =>
  normalizeEnvValue(process.env.RESEND_FROM_EMAIL) || "Pennywise <onboarding@resend.dev>";
const getSendGridApiKey = () => normalizeEnvValue(process.env.SENDGRID_API_KEY);
const getSendGridFromAddress = () =>
  normalizeEnvValue(process.env.SENDGRID_FROM_EMAIL) || normalizeEnvValue(process.env.EMAIL_USER);

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

const hasConfiguredSmtpCredentials = () => {
  const emailUser = normalizeEnvValue(process.env.EMAIL_USER);
  const emailPass = normalizeEnvValue(process.env.EMAIL_PASS);
  return !isPlaceholderEmailConfig(emailUser, emailPass);
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
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
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

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const sendViaResend = async ({ to, subject, text, html }) => {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    return false;
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: getResendFromAddress(),
      to: [to],
      subject,
      text,
      html
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API failed: ${response.status} ${errorText}`);
  }

  console.log(`Resend email accepted for ${to}`);
  return true;
};

const sendViaSendGrid = async ({ to, subject, text, html }) => {
  const apiKey = getSendGridApiKey();
  const fromAddress = getSendGridFromAddress();

  if (!apiKey || !fromAddress) {
    return false;
  }

  const response = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
          subject
        }
      ],
      from: {
        email: fromAddress,
        name: "Pennywise"
      },
      reply_to: {
        email: fromAddress,
        name: "Pennywise"
      },
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid API failed: ${response.status} ${errorText}`);
  }

  console.log(`SendGrid email accepted for ${to}`);
  return true;
};

exports.sendOTP = async (email, otp) => {
  const subject = "Pennywise - Your OTP Code";
  const text = `Your Pennywise OTP is ${otp}. It expires in 5 minutes.`;
  const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 420px; margin: 0 auto; color: #111827;">
          <h2 style="color: #0066ff;">Pennywise</h2>
          <p>Use this verification code to finish creating your account:</p>
          <div style="background: #f0f4ff; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0066ff;">${otp}</span>
          </div>
          <p style="margin: 0 0 10px;">This code expires in 5 minutes.</p>
          <p style="margin: 0; color: #6b7280; font-size: 13px;">If you did not request this, you can ignore this email.</p>
        </div>
      `;

  const sendOtpMail = async () => {
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
      subject,
      text,
      html
    };

    const info = await mailTransporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
      console.log("Email preview created successfully.");
    } else {
      console.log(`Email sent to ${email}`);
    }

    return true;
  };

  if (hasConfiguredSmtpCredentials()) {
    try {
      if (await sendOtpMail()) {
        return true;
      }
    } catch (error) {
      console.error("SMTP email send failed:", error.message);
      transporter = null;
      etherealAccount = null;
    }
  }

  try {
    if (await sendViaSendGrid({ to: email, subject, text, html })) {
      return true;
    }
  } catch (error) {
    console.error("SendGrid send failed:", error.message);
  }

  try {
    if (await sendViaResend({ to: email, subject, text, html })) {
      return true;
    }
  } catch (error) {
    console.error("Resend send failed:", error.message);
  }

  try {
    return await sendOtpMail();
  } catch (error) {
    console.error("Email send failed:", error.message);
    transporter = null;
    etherealAccount = null;

    try {
      await wait(EMAIL_RETRY_DELAY_MS);
      return await sendOtpMail();
    } catch (retryError) {
      console.error("OTP retry send failed:", retryError.message);
      return false;
    }
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
