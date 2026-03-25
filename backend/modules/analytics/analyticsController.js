const analyticsModel = require('./analyticsModel');

const getAnalyticsSummary = async (req, res) => {
    // Extract parameters from the request query string
    const { month, year, userId } = req.query; 

    // Validation: Ensure month and year are provided
    if (!month || !year) {
        return res.status(400).json({ error: "Month and Year are required parameters." });
    }

    // Defaulting to User ID 1 for testing until Auth is implemented
    const id = userId || 1; 

    try {
        const data = await analyticsModel.getFilteredTransactions(id, month, year);
        
        if (data.length === 0) {
            return res.status(200).json([]); // Return empty array if no data found
        }
        
        res.status(200).json(data);

        
   // Inside analyticsController.js
} catch (err) {
    console.error("DETAILED ERROR:", err); // This will print the SQL error in your terminal
    res.status(500).json({ error: err.message }); // This sends the real error to your browser
}
};


module.exports = {
    getAnalyticsSummary
};