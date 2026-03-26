const nodemailer = require("nodemailer");
require("dotenv").config();

let transporter = null;
let etherealAccount = null;

// Initialize transporter — try Gmail first, fall back to Ethereal test account
const getTransporter = async () => {
    if (transporter) return transporter;

    // Try Gmail if credentials look valid
    if (
        process.env.EMAIL_USER &&
        process.env.EMAIL_USER !== "your_email@gmail.com" &&
        process.env.EMAIL_PASS
    ) {
        try {
            const gmailTransporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
            // Verify the connection works
            await gmailTransporter.verify();
            console.log("✅ Gmail SMTP connected successfully");
            transporter = gmailTransporter;
            return transporter;
        } catch (err) {
            console.warn("⚠️  Gmail SMTP failed:", err.message);
            console.log("📧 Falling back to Ethereal test email...");
        }
    }

    // Fall back to Ethereal test account (always works, emails viewable via URL)
    try {
        etherealAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: etherealAccount.user,
                pass: etherealAccount.pass,
            },
        });
        console.log("✅ Ethereal test email ready");
        console.log(`   📬 View sent emails at: https://ethereal.email/login`);
        console.log(`   👤 User: ${etherealAccount.user}`);
        console.log(`   🔑 Pass: ${etherealAccount.pass}`);
        return transporter;
    } catch (err) {
        console.error("❌ Ethereal setup failed:", err.message);
        return null;
    }
};

// Initialize on startup
getTransporter().catch(() => {});

exports.sendOTP = async (email, otp) => {
    // Always log OTP to console for debugging
    console.log(`\n================================`);
    console.log(`OTP for ${email}: ${otp}`);
    console.log(`================================\n`);

    const t = await getTransporter();
    if (!t) {
        console.log("📋 No email transporter available. Use OTP from console above.");
        return true;
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
                <p style="color: #666; font-size: 14px;">This code will expire in 15 minutes.</p>
            </div>
        `,
    };

    try {
        const info = await t.sendMail(mailOptions);
        
        // If using Ethereal, show the preview URL
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`📧 Email preview: ${previewUrl}`);
        } else {
            console.log(`✅ Email sent to ${email}`);
        }
        return true;
    } catch (error) {
        console.error("⚠️  Email send failed:", error.message);
        console.log("📋 Use the OTP from the console log above.");
        return true;
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

    console.log(`\n================================`);
    console.log(`BUDGET ALERT for ${email}`);
    console.log(`Budget: ${budgetAmount} | Spent: ${currentSpending}`);
    console.log(`Thresholds: ${triggeredThresholds}`);
    console.log(`================================\n`);

    const t = await getTransporter();
    if (!t) return true;

    const fromAddress = etherealAccount
        ? etherealAccount.user
        : process.env.EMAIL_USER;

    const mailOptions = {
        from: `"Pennywise" <${fromAddress}>`,
        to: email,
        subject: "Pennywise - Budget Alert Triggered",
        text: `Your spending has reached ${currentSpending} out of ${budgetAmount}. Triggered thresholds: ${triggeredThresholds}.`,
    };

    try {
        const info = await t.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`📧 Budget alert preview: ${previewUrl}`);
        }
        return true;
    } catch (error) {
        console.error("⚠️  Budget alert email failed:", error.message);
        return true;
    }
};
