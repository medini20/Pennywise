const db = require("../../config/db");

// GET PROFILE
exports.getProfile = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT name AS username, email
    FROM users
    WHERE user_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(results[0]);
  });
};

// UPDATE PROFILE
exports.updateProfile = (req, res) => {
  const userId = req.user.id;
  const { username, email } = req.body;

  const query = `
    UPDATE users
    SET name = ?, email = ?
    WHERE user_id = ?
  `;

  db.query(query, [username, email, userId], (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json({ message: "Profile updated successfully" });
  });
};