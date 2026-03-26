const express = require("express");
const router = express.Router();
const userController = require("./userController");
const { requireAuth } = require("../../middleware/authMiddleware");

router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.post("/verify-otp", userController.verifyOtp);
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);
router.post("/change-password", requireAuth, userController.changePassword);
router.post("/logout", userController.logout);
router.post("/check-username", userController.checkUsername);
router.post("/google", userController.googleLogin);

module.exports = router;
