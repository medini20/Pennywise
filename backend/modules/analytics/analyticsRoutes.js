const express = require('express');
const router = express.Router();
const analyticsController = require('./analyticsController');

// Define the endpoint for summary data
// This will be accessible at /api/analytics/summary
router.get('/summary', analyticsController.getAnalyticsSummary);

module.exports = router;