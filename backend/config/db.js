const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "pennywise",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Test connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }
    console.log("Connected to MySQL database");
    connection.release();
});

// Provide SQLite-compatible wrapper methods so existing controllers work
// db.query() — native MySQL (used by budget controller)
// db.all()  — SQLite compat: returns rows array
// db.run()  — SQLite compat: callback with this.lastID / this.changes
// db.get()  — SQLite compat: returns single row

const db = {
    query: pool.query.bind(pool),

    all: (sql, params, callback) => {
        pool.query(sql, params, (err, rows) => {
            callback(err, rows || []);
        });
    },

    run: (sql, params, callback) => {
        pool.query(sql, params, function (err, result) {
            if (callback) {
                // Mimic SQLite's this.lastID and this.changes
                callback.call(
                    {
                        lastID: result ? result.insertId : null,
                        changes: result ? result.affectedRows : 0,
                    },
                    err
                );
            }
        });
    },

    get: (sql, params, callback) => {
        pool.query(sql, params, (err, rows) => {
            callback(err, rows ? rows[0] : undefined);
        });
    },
};

module.exports = db;