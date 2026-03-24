const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./config/db");

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Allows React (port 3000) to talk to this server (port 5001)

// Import routes
const profileRoutes = require("./modules/profile/profileRoutes");
const budgetRoutes = require("./modules/budget/budgetRoutes");
const userRoutes = require("./modules/user/userRoutes");
const analyticsRoute = require("./modules/analytics/analyticsRoutes");
const alertsRoutes = require("./modules/alerts/alertsRoutes");
const transactionRoutes = require("./modules/transactions/transactionRoutes");


// Use routes
app.use("/api/profile", profileRoutes);
app.use("/budget", budgetRoutes);
app.use("/auth", userRoutes);
app.use("/api/analytics", analyticsRoute);
app.use("/alerts", alertsRoutes);
app.use("/api/transactions", transactionRoutes);
// Test route
app.get("/", (req, res) => {
    res.send("Pennywise API running");
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
