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
    // If no real credentials, just log the OTP to console (pseudo-send) for testing
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
        console.log(`\n================================`);
        console.log(`MOCK EMAIL SENT TO: ${email}`);
        console.log(`YOUR OTP IS: ${otp}`);
        console.log(`================================\n`);
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
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
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
