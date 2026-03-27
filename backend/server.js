const express = require("express");
const cors = require("cors");
require("dotenv").config({ quiet: true });
const { ensureRuntimeSchema } = require("./config/runtimeSchema");
const profileRoutes = require("./modules/profile/profileRoutes");
const budgetRoutes = require("./modules/budget/budgetRoutes");
const categoryRoutes = require("./modules/category/categoryRoutes");
const userRoutes = require("./modules/user/userRoutes");
const analyticsRoute = require("./modules/analytics/analyticsRoutes");
const alertsRoutes = require("./modules/alerts/alertsRoutes");
const transactionRoutes = require("./modules/transactions/transactionRoutes");

const app = express();

// middleware
app.use(express.json());
app.use(cors());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// use routes
app.use("/api/profile", profileRoutes);
app.use("/budget", budgetRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/auth", userRoutes);
app.use("/api/analytics", analyticsRoute);
app.use("/alerts", alertsRoutes);
app.use("/api/transactions", transactionRoutes);

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

const startServer = async () => {
  try {
    await ensureRuntimeSchema();
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `Port ${PORT} is already in use. Kill the existing process or use a different port.`
        );
        process.exit(1);
      } else {
        console.error("Server error:", err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

module.exports = app;
