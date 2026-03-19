const express = require("express");
const cors = require("cors");
const mysql = require("mysql2"); // 1. Add MySQL
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Allows your React app (port 3000) to talk to this server (port 5001)

// 2. Database Connection Logic
// This connects your server to the 'expense_tracker' or 'pennywise' DB
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "expense_tracker",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Check Connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    // console.log(" Connected to MySQL Database");
    connection.release();
  }
});

// Import routes
const profileRoutes = require("./modules/profile/profileRoutes");
const budgetRoutes = require("./modules/budget/budgetRoutes");
const userRoutes = require("./modules/user/userRoutes");

// Use routes
app.use("/api/profile", profileRoutes);
app.use("/budget", budgetRoutes); // Matches your fetch("http://localhost:5001/budget/list")
app.use("/auth", userRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("Pennywise API running");
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = db; // Export db so your routes can use it