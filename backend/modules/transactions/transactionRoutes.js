const express = require("express");
const router = express.Router();

const {
  addTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction
} = require("./transactionController");

router.post("/add", addTransaction);
router.get("/", getTransactions);
router.put("/:transactionId", updateTransaction);
router.delete("/:transactionId", deleteTransaction);

module.exports = router;
