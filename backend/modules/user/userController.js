const db = require("../../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const emailService = require("../../utils/emailService");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// MySQL datetime format helper (YYYY-MM-DD HH:MM:SS)
const toMySQLDatetime = (date) => {
    return date.toISOString().slice(0, 19).replace('T', ' ');
};

// generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Check if username is already taken
exports.checkUsername = (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });

    db.all("SELECT id, is_verified FROM users WHERE username = ?", [username], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        // Only consider verified users as "taken"
        const verifiedUser = rows.find(r => r.is_verified === 1);
        if (verifiedUser) return res.json({ available: false, message: "Username already taken" });
        res.json({ available: true, message: "Username is available" });
    });
};

exports.signup = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Check if email is used by a VERIFIED user
        db.all("SELECT * FROM users WHERE email = ?", [email], async (err, emailRows) => {
            if (err) { console.error("Signup email check error:", err.message); return res.status(500).json({ error: "Database error" }); }
            if (emailRows.length > 0 && emailRows[0].is_verified === 1) {
                return res.status(400).json({ error: "Email already exists" });
            }

            // Check if username is used by a VERIFIED user
            db.all("SELECT * FROM users WHERE username = ?", [username], async (err, userRows) => {
                if (err) { console.error("Signup username check error:", err.message); return res.status(500).json({ error: "Database error" }); }
                if (userRows.length > 0 && userRows[0].is_verified === 1) {
                    return res.status(400).json({ error: "Username already taken" });
                }

                // Delete any existing unverified users with this email or username, and their OTPs
                db.run("DELETE FROM otps WHERE email = ?", [email], (err) => {
                    if (err) console.error("Cleanup OTPs error:", err.message);

                    db.run("DELETE FROM users WHERE (email = ? OR username = ?) AND is_verified = 0", [email, username], async (err) => {
                        if (err) console.error("Cleanup unverified users error:", err.message);

                        const salt = await bcrypt.genSalt(10);
                        const password_hash = await bcrypt.hash(password, salt);

                        db.run(
                            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                            [username, email, password_hash],
                            function (err) {
                                if (err) { console.error("Signup INSERT user error:", err.message); return res.status(500).json({ error: "Failed to create user" }); }

                                const otp = generateOTP();
                                const expiresAt = toMySQLDatetime(new Date(Date.now() + 15 * 60 * 1000));

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
            });
        });
    } catch (error) {
        console.error("Signup uncaught error:", error);
        res.status(500).json({ error: "Server error" });
    }
};

exports.verifyOtp = (req, res) => {
    const { email, otpCode } = req.body;
    const now = toMySQLDatetime(new Date());
    db.all(
        "SELECT * FROM otps WHERE email = ? AND otp_code = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
        [email, otpCode, now],
        (err, rows) => {
            if (err) return res.status(500).json({ error: "Database error" });
            if (rows.length === 0) return res.status(400).json({ error: "Invalid or expired OTP" });

            const purpose = rows[0].purpose;

            // Delete used OTP to prevent reuse
            db.run("DELETE FROM otps WHERE email = ? AND otp_code = ?", [email, otpCode]);

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
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }
    // Support login with either username or email
    const isEmail = username && username.includes('@');
    const query = isEmail
        ? "SELECT * FROM users WHERE email = ?"
        : "SELECT * FROM users WHERE username = ?";

    db.all(query, [username], async (err, rows) => {
        if (err) {
            console.error("Login DB error:", err.message);
            return res.status(500).json({ error: "Database error" });
        }
        if (rows.length === 0) return res.status(400).json({ error: "Invalid username or password" });

        const user = rows[0];
        if (!user.is_verified) return res.status(403).json({ error: "Account not verified. Please verify your OTP." });

        try {
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) return res.status(400).json({ error: "Invalid username or password" });

            const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'secret', { expiresIn: "1d" });
            res.json({ message: "Login successful", token, user: { id: user.id, username: user.username, email: user.email } });
        } catch (bcryptErr) {
            console.error("Login bcrypt error:", bcryptErr.message);
            return res.status(500).json({ error: "Server error" });
        }
    });
};

exports.forgotPassword = (req, res) => {
    const { email } = req.body;
    db.all("SELECT * FROM users WHERE email = ?", [email], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (rows.length === 0) return res.status(400).json({ error: "User not found" });

        const otp = generateOTP();
        const expiresAt = toMySQLDatetime(new Date(Date.now() + 15 * 60 * 1000));

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
    const now = toMySQLDatetime(new Date());
    db.all(
        "SELECT * FROM otps WHERE email = ? AND otp_code = ? AND purpose = 'PASSWORD_RESET' AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
        [email, otpCode, now],
        async (err, rows) => {
            if (err) return res.status(500).json({ error: "Database error" });
            if (rows.length === 0) return res.status(400).json({ error: "Invalid or expired OTP" });

            try {
                const salt = await bcrypt.genSalt(10);
                const password_hash = await bcrypt.hash(newPassword, salt);

                // Delete used OTPs for this email
                db.run("DELETE FROM otps WHERE email = ? AND purpose = 'PASSWORD_RESET'", [email]);

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
