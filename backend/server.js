const express = require("express");
const cors = require("cors");
require("dotenv").config();
const profileRoutes = require("./modules/profile/profileRoutes");
const app = express();

// middleware
app.use(express.json());
app.use(cors());
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

// start server
app.listen(5001, () => {
    console.log("Server running on port 5001");
});