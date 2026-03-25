const db = require("../../config/db");

exports.addTransaction = (req, res) => {
  const { user_id, amount, type, description, note, transaction_date } = req.body;

  const finalDescription = description || note || "No description";
  const finalTransactionDate =
    typeof transaction_date === "string" && transaction_date.trim()
      ? transaction_date
      : new Date().toISOString().slice(0, 10);

  const query = `
    INSERT INTO transactions (user_id, amount, type, description, transaction_date)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [user_id, amount, type, finalDescription, finalTransactionDate], (err, result) => {
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
