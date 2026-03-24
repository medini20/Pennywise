// Go up to modules, up to backend, then into config
const db = require('../../config/db.js'); 

const analyticsModel = {
    getFilteredTransactions: (userId, month, year) => {
        return new Promise((resolve, reject) => {
            const query = `
    SELECT t.transaction_id, t.amount, t.type, t.transaction_date AS date, c.name AS category
    FROM transactions t
    JOIN categories c ON t.category_id = c.category_id
    WHERE t.user_id = ? 
    AND MONTH(t.transaction_date) = ? 
    AND YEAR(t.transaction_date) = ?
    ORDER BY t.transaction_date ASC
`;

            db.query(query, [userId, month, year], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }
};

module.exports = analyticsModel;