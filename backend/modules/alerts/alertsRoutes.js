const express = require("express");
const router = express.Router();
const alertsController = require("./alertsController");

router.get("/data", alertsController.getAlertData);
router.post("/budget", alertsController.saveBudget);
router.post("/", alertsController.createAlert);
router.post("/check", alertsController.checkTriggeredAlerts);
router.delete("/:id", alertsController.deleteAlert);

module.exports = router;
