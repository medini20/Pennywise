const express = require("express");
const cors = require("cors");
require("dotenv").config();

// 1. Import the centralized database connection
const db = require("./config/db"); 

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Allows React (port 3000) to talk to this server (port 5001)

// 2. Import routes
const profileRoutes = require("./modules/profile/profileRoutes");
const budgetRoutes = require("./modules/budget/budgetRoutes");
const userRoutes = require("./modules/user/userRoutes");
const analyticsRoute = require("./modules/analytics/analyticsRoutes"); // Added this

// 3. Use routes
app.use("/api/profile", profileRoutes);
app.use("/budget", budgetRoutes); 
app.use("/auth", userRoutes);
app.use("/api/analytics", analyticsRoute); // Final endpoint: /api/analytics/summary

// Test route
app.get("/", (req, res) => {
    res.send("Pennywise API running");
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

// Export the app instance (standard practice for Express)
module.exports = app;