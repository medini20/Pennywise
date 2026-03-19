const db = require("../../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const emailService = require("../../utils/emailService");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Check if username is already taken
exports.checkUsername = (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });

    db.all("SELECT id FROM users WHERE username = ?", [username], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (rows.length > 0) return res.json({ available: false, message: "Username already taken" });
        res.json({ available: true, message: "Username is available" });
    });
};

exports.signup = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Check email uniqueness
        db.all("SELECT * FROM users WHERE email = ?", [email], async (err, emailRows) => {
            if (err) { console.error("Signup email check error:", err.message); return res.status(500).json({ error: "Database error" }); }
            if (emailRows.length > 0) return res.status(400).json({ error: "Email already exists" });

            // Check username uniqueness
            db.all("SELECT * FROM users WHERE username = ?", [username], async (err, userRows) => {
                if (err) { console.error("Signup username check error:", err.message); return res.status(500).json({ error: "Database error" }); }
                if (userRows.length > 0) return res.status(400).json({ error: "Username already taken" });

                const salt = await bcrypt.genSalt(10);
                const password_hash = await bcrypt.hash(password, salt);

                db.run(
                    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                    [username, email, password_hash],
                    function (err) {
                        if (err) { console.error("Signup INSERT user error:", err.message); return res.status(500).json({ error: "Failed to create user" }); }

                        const otp = generateOTP();
                        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

                        db.run(
                            "INSERT INTO otps (email, otp_code, purpose, expires_at) VALUES (?, ?, 'SIGNUP', ?)",
                            [email, otp, expiresAt],
                            async function (err) {
                                if (err) { console.error("Signup INSERT OTP error:", err.message); return res.status(500).json({ error: "Failed to generate OTP" }); }

                                try {
                                    const sent = await emailService.sendOTP(email, otp);
                                    if (sent) {
                                        res.status(201).json({ message: "User registered. Please check email for OTP." });
                                    } else {
                                        console.error("OTP email send failed for:", email);
                                        res.status(201).json({ message: "User registered but email failed. Contact support." });
                                    }
                                } catch (emailErr) {
                                    console.error("OTP email exception:", emailErr.message);
                                    res.status(201).json({ message: "User registered but email failed. Contact support." });
                                }
                            }
                        );
                    }
                );
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

exports.verifyOtp = (req, res) => {
    const { email, otpCode } = req.body;
    db.all(
        "SELECT * FROM otps WHERE email = ? AND otp_code = ? AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1",
        [email, otpCode],
        (err, rows) => {
            if (err) return res.status(500).json({ error: "Database error" });
            if (rows.length === 0) return res.status(400).json({ error: "Invalid or expired OTP" });

            const purpose = rows[0].purpose;
            if (purpose === 'SIGNUP') {
                db.run("UPDATE users SET is_verified = 1 WHERE email = ?", [email], (err) => {
                    if (err) return res.status(500).json({ error: "Failed to verify user" });
                    res.json({ message: "User verified successfully. You can now login." });
                });
            } else {
                res.json({ message: "OTP verified. Proceed to next step." });
            }
        }
    );
};

exports.login = (req, res) => {
    const { username, password } = req.body;
    // Support login with either username or email
    const isEmail = username && username.includes('@');
    const query = isEmail
        ? "SELECT * FROM users WHERE email = ?"
        : "SELECT * FROM users WHERE username = ?";

    db.all(query, [username], async (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (rows.length === 0) return res.status(400).json({ error: "Invalid username or password" });

        const user = rows[0];
        if (!user.is_verified) return res.status(403).json({ error: "Account not verified. Please verify your OTP." });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: "Invalid username or password" });

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'secret', { expiresIn: "1d" });
        res.json({ message: "Login successful", token, user: { id: user.id, username: user.username, email: user.email } });
    });
};

exports.forgotPassword = (req, res) => {
    const { email } = req.body;
    db.all("SELECT * FROM users WHERE email = ?", [email], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (rows.length === 0) return res.status(400).json({ error: "User not found" });

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        db.run(
            "INSERT INTO otps (email, otp_code, purpose, expires_at) VALUES (?, ?, 'PASSWORD_RESET', ?)",
            [email, otp, expiresAt],
            async function (err) {
                if (err) return res.status(500).json({ error: "Failed to generate OTP" });

                await emailService.sendOTP(email, otp);
                res.json({ message: "OTP sent to email for password reset." });
            }
        );
    });
};

exports.resetPassword = async (req, res) => {
    const { email, otpCode, newPassword } = req.body;
    db.all(
        "SELECT * FROM otps WHERE email = ? AND otp_code = ? AND purpose = 'PASSWORD_RESET' AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1",
        [email, otpCode],
        async (err, rows) => {
            if (err) return res.status(500).json({ error: "Database error" });
            if (rows.length === 0) return res.status(400).json({ error: "Invalid or expired OTP" });

            try {
                const salt = await bcrypt.genSalt(10);
                const password_hash = await bcrypt.hash(newPassword, salt);

                db.run("UPDATE users SET password_hash = ? WHERE email = ?", [password_hash, email], (err) => {
                    if (err) return res.status(500).json({ error: "Failed to reset password" });
                    res.json({ message: "Password reset successful. You can now login." });
                });
            } catch (error) {
                res.status(500).json({ error: "Server error" });
            }
        }
    );
};

exports.logout = (req, res) => {
    res.json({ message: "Logged out successfully" });
};

// Google Sign-In
exports.googleLogin = async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        // Check if user exists
        db.all("SELECT * FROM users WHERE email = ?", [email], (err, rows) => {
            if (err) return res.status(500).json({ error: "Database error" });

            if (rows.length > 0) {
                // Existing user — issue token
                const user = rows[0];
                const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'secret', { expiresIn: "1d" });
                return res.json({ message: "Login successful", token, user: { id: user.id, username: user.username, email: user.email } });
            }

            // New user — auto-create with Google info
            const username = name.replace(/\s+/g, '_').toLowerCase() + '_' + googleId.slice(-4);
            const randomPass = require('crypto').randomBytes(32).toString('hex');

            bcrypt.hash(randomPass, 10, (err, password_hash) => {
                if (err) return res.status(500).json({ error: "Server error" });

                db.run(
                    "INSERT INTO users (username, email, password_hash, is_verified) VALUES (?, ?, ?, 1)",
                    [username, email, password_hash],
                    function (err) {
                        if (err) return res.status(500).json({ error: "Failed to create user" });

                        const token = jwt.sign({ id: this.lastID, username }, process.env.JWT_SECRET || 'secret', { expiresIn: "1d" });
                        res.json({ message: "Login successful", token, user: { id: this.lastID, username, email } });
                    }
                );
            });
        });
    } catch (error) {
        console.error("Google auth error:", error);
        res.status(401).json({ error: "Invalid Google token" });
    }
};
