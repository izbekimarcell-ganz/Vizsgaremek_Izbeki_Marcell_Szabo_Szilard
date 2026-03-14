const express = require("express");
const { getUsers, toggleUserActive } = require("../controllers/userController");
const { authenticateToken, requireAdmin } = require("../utils/auth");

const router = express.Router();

router.get("/", authenticateToken, requireAdmin, getUsers);
router.put("/:id/toggle-active", authenticateToken, requireAdmin, toggleUserActive);

module.exports = router;
