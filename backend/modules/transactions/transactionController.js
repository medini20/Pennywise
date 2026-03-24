const db = require("../../config/db");

exports.addTransaction = (req, res) => {
  const { user_id, amount, type, description, note } = req.body;

  const finalDescription = description || note || "No description";

  const query = `
    INSERT INTO transactions (user_id, amount, type, description, transaction_date)
    VALUES (?, ?, ?, ?, NOW())
  `;

  db.query(query, [user_id, amount, type, finalDescription], (err, result) => {
    if (err) {
      console.error("INSERT ERROR:", err);  
      return res.status(500).json({ message: "Insert failed" });
    }

    res.json({ message: "Transaction added successfully" });
  });
};

   
// GET
exports.getTransactions = (req, res) => {
  const { user_id } = req.query;

  const query = `
    SELECT * FROM transactions
    WHERE user_id = ?
    ORDER BY transaction_date DESC
  `;

  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    res.json(results);
  });
};