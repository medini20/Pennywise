const db = require("../../config/db");

// 1. GET ALL BUDGETS
// Fixed: Removed the JOIN to 'categories' since you store name/icon in 'budgets'
exports.getBudgets = (req, res) => {
  const query = "SELECT * FROM budgets";

  db.query(query, (err, result) => {
    if (err) {
      console.error("❌ SQL Error in getBudgets:", err.message);
      return res.status(500).json(err);
    }
    // Result is an array, which prevents the 'map is not a function' error
    res.json(result);
  });
};

// 2. ADD NEW BUDGET
// ADD NEW BUDGET
exports.addBudget = (req, res) => {
  const { name, amount, icon, user_id, month } = req.body;

  // REMOVED 'color' from the SQL query below
  const query = "INSERT INTO budgets (name, amount, icon, user_id, month, spent) VALUES (?, ?, ?, ?, ?, 0)";
  
  const values = [
    name, 
    amount, 
    icon, 
    user_id || 1, 
    month || 1
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("❌ SQL Error in addBudget:", err.message);
      return res.status(500).json({ error: err.message });
    }
    
    res.status(201).json({
      budget_id: result.insertId,
      name,
      amount,
      icon,
      spent: 0
    });
  });
};
// 3. EDIT BUDGET AMOUNT
exports.editBudget = (req, res) => {
  const { budget_id, amount } = req.body;

  const query = "UPDATE budgets SET amount = ? WHERE budget_id = ?";

  db.query(query, [amount, budget_id], (err, result) => {
    if (err) {
      console.error("❌ SQL Error in editBudget:", err.message);
      return res.status(500).json(err);
    }
    res.json({ message: "Budget updated successfully" });
  });
};

// 4. DELETE BUDGET
exports.deleteBudget = (req, res) => {
  const id = req.params.id;

  const query = "DELETE FROM budgets WHERE budget_id = ?";

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("❌ SQL Error in deleteBudget:", err.message);
      return res.status(500).json(err);
    }
    res.json({ message: "Budget deleted successfully" });
  });
};