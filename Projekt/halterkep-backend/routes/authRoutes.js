const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getForgotPasswordQuestion,
  resetPasswordWithSecurityQuestion,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password/question", getForgotPasswordQuestion);
router.post("/forgot-password/reset", resetPasswordWithSecurityQuestion);

module.exports = router;
