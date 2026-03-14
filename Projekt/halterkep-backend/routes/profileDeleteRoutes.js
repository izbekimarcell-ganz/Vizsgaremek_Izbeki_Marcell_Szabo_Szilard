const express = require("express");
const router = express.Router();
const { deleteProfile } = require("../controllers/profileDeleteController");
const { authenticateToken } = require("../utils/auth");

router.delete("/delete", authenticateToken, deleteProfile);

module.exports = router;
