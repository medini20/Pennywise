const express = require("express");
const cors = require("cors");

const app = express();

// middleware
app.use(express.json());
app.use(cors());

// import routes
const budgetRoutes = require("./modules/budget/budgetRoutes");

// use routes
app.use("/budget", budgetRoutes);

// test route
app.get("/", (req, res) => {
    res.send("Pennywise API running");
});

// start server
app.listen(5000, () => {
    console.log("Server running on port 5000");
});