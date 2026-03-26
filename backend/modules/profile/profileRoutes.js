const express = require("express");
const router = express.Router();

const profileController = require("./profileController");
const { requireAuth } = require("../../middleware/authMiddleware");


router.get("/", requireAuth, profileController.getProfile);

router.put("/", requireAuth, profileController.updateProfile);

module.exports = router;
