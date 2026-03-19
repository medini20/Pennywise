const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Your MySQL password (usually empty for XAMPP)
  database: 'expense_tracker' // Make sure this matches your phpMyAdmin DB name
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  console.log('✅ Connected to MySQL Database');
});

module.exports = db;