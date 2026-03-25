const express = require("express");
const cors = require("cors");
require("dotenv").config();
const profileRoutes = require("./modules/profile/profileRoutes");
const app = express();

// middleware
app.use(express.json());
app.use(cors());

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

app.use("/api/profile", profileRoutes);
// import routes
const budgetRoutes = require("./modules/budget/budgetRoutes");
const userRoutes = require("./modules/user/userRoutes");

// use routes
app.use("/budget", budgetRoutes);
app.use("/auth", userRoutes);

// test route
app.get("/", (req, res) => {
    res.send("Pennywise API running");
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// start server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Kill the existing process or use a different port.`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
        process.exit(1);
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});