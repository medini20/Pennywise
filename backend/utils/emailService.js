const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendOTP = async (email, otp) => {
    // Always log OTP to console for debugging/testing
    console.log(`\n================================`);
    console.log(`OTP for ${email}: ${otp}`);
    console.log(`================================\n`);

    // If no real credentials, just use console (mock mode)
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
        return true;
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Pennywise - Your OTP Code",
        text: `Your OTP code is ${otp}. It will expire in 15 minutes.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${email}`);
        return true;
    } catch (error) {
        console.error("⚠️ Email send failed:", error.message);
        console.log(`📋 Use the OTP from the console log above to verify.`);
        return true; // Return true so signup still succeeds — OTP is in console
    }
};

exports.sendBudgetAlert = async (email, data) => {
    const { budgetAmount, currentSpending, triggeredAlerts } = data;
    const triggeredThresholds = triggeredAlerts.map((alert) => `${alert.percentage}%`).join(", ");

    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === "your_email@gmail.com") {
        console.log(`\n================================`);
        console.log(`MOCK BUDGET ALERT SENT TO: ${email}`);
        console.log(`Budget: ${budgetAmount}`);
        console.log(`Current spending: ${currentSpending}`);
        console.log(`Triggered thresholds: ${triggeredThresholds}`);
        console.log(`================================\n`);
        return true;
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Pennywise - Budget Alert Triggered",
        text: `Your spending has reached ${currentSpending} out of ${budgetAmount}. Triggered thresholds: ${triggeredThresholds}.`
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
};
