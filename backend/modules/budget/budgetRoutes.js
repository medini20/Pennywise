const express = require("express");

const router = express.Router();

const {
  getBudgets,
  addBudget,
  editBudget,
  deleteBudget
} = require("./budgetController");

router.get("/list", getBudgets);

router.post("/add", addBudget);

router.put("/edit", editBudget);

router.delete("/:id", deleteBudget);

module.exports = router;