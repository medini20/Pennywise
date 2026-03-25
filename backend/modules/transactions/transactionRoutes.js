const express = require("express");
const router = express.Router();

const {
  addTransaction,
  getTransactions
} = require("./transactionController");

// routes
router.post("/add", addTransaction);
router.get("/", getTransactions);

module.exports = router;