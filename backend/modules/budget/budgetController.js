const db = require("../../config/db");
exports.getBudgets = (req, res) => {

  const query = `
  SELECT budgets.*, categories.name
  FROM budgets
  LEFT JOIN categories
  ON budgets.category_id = categories.category_id
  `;

  db.query(query, (err, result) => {

    if (err) {
      console.log(err);
      return res.status(500).json(err);
    }

    res.json(result);

  });

};



exports.addBudget = (req, res) => {

  const { user_id, category_id, amount, month } = req.body;

  const query = `
  INSERT INTO budgets (user_id, category_id, amount, month)
  VALUES (?, ?, ?, ?)
  `;

  db.query(query, [user_id, category_id, amount, month], (err, result) => {

    if (err) {
      return res.status(500).json(err);
    }

    res.json({ message: "Budget added successfully" });

  });

};


exports.editBudget = (req, res) => {

  const { budget_id, amount } = req.body;

  const query = `
  UPDATE budgets
  SET amount = ?
  WHERE budget_id = ?
  `;

  db.query(query, [amount, budget_id], (err, result) => {

    if (err) {
      return res.status(500).json(err);
    }

    res.json({ message: "Budget updated" });

  });

};


exports.deleteBudget = (req, res) => {

  const id = req.params.id;

  const query = `
  DELETE FROM budgets
  WHERE budget_id = ?
  `;

  db.query(query, [id], (err, result) => {

    if (err) {
      return res.status(500).json(err);
    }

    res.json({ message: "Budget deleted" });

  });

};