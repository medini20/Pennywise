const db = require("../../config/db");

// 1. GET ALL BUDGETS
exports.getBudgets = (req, res) => {
  const query = "SELECT * FROM budgets WHERE COALESCE(is_system_generated, 0) = 0 ORDER BY budget_id DESC";

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
exports.addBudget = (req, res) => {
  const { name, amount, icon, user_id, month, color } = req.body;
  const query = `
    INSERT INTO budgets (name, amount, icon, user_id, month, spent, color, is_system_generated)
    VALUES (?, ?, ?, ?, ?, 0, ?, 0)
  `;
  
  const values = [
    name, 
    amount, 
    icon, 
    user_id || 1, 
    month || 1,
    color || "#ffcc00"
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
      spent: 0,
      color: color || "#ffcc00"
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
