const express = require("express");
const router = express.Router();
const budgetController = require("./budgetController");

router.post("/set", budgetController.setBudget);
router.get("/list", budgetController.getBudgets);
router.put("/edit/:id", budgetController.editBudget);

module.exports = router;