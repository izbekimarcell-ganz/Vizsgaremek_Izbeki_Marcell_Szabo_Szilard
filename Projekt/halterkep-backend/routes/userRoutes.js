const express = require("express");
const { getUsers, toggleUserActive, searchUsers } = require("../controllers/userController");
const { authenticateToken, requireAdmin } = require("../utils/auth");

const router = express.Router();

router.get("/search", searchUsers);
router.get("/", authenticateToken, requireAdmin, getUsers);
router.put("/:id/toggle-active", authenticateToken, requireAdmin, toggleUserActive);

module.exports = router;
