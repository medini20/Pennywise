const db = require("../../config/db");

// set budget
exports.setBudget = (req, res) => {

    const { user_id, category_id, amount, month } = req.body;

    const query = "INSERT INTO budgets (user_id, category_id, amount, month) VALUES (?, ?, ?, ?)";

    db.query(query, [user_id, category_id, amount, month], (err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json({
            message: "Budget created successfully"
        });

    });

};


// get budgets
exports.getBudgets = (req, res) => {

    const query = "SELECT * FROM budgets";

    db.query(query, (err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(result);

    });

};


// edit budge
exports.editBudget = (req, res) => {

    const id = req.params.id;
    const { amount } = req.body;

    const query = "UPDATE budgets SET amount = ? WHERE budget_id = ?";

    db.query(query, [amount, id], (err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json({
            message: "Budget updated"
        });

    });

};