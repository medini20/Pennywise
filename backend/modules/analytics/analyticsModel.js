const db = require("../../config/db.js");

const analyticsModel = {
  getFilteredTransactions: (userId, month, year) =>
    new Promise((resolve, reject) => {
      const query = `
        SELECT
          t.transaction_id,
          t.amount,
          t.type,
          t.transaction_date AS date,
          c.name AS category
        FROM transactions t
        JOIN categories c ON t.category_id = c.category_id
        WHERE t.user_id = ?
          AND YEAR(t.transaction_date) = ?
          ${month ? "AND MONTH(t.transaction_date) = ?" : ""}
        ORDER BY t.transaction_date ASC
      `;

      const params = month ? [userId, year, month] : [userId, year];

      db.query(query, params, (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(results);
      });
    })
};

module.exports = analyticsModel;
