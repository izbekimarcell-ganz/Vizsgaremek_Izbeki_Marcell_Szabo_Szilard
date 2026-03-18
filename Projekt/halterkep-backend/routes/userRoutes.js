const express = require("express");
const { getUsers, toggleUserActive, searchUsers, getPublicUserProfile, deleteUserByAdmin } = require("../controllers/userController");
const { authenticateToken, authenticateTokenOptional, requireAdmin } = require("../utils/auth");

const router = express.Router();

router.get("/search", searchUsers);
router.get("/:id/profile", authenticateTokenOptional, getPublicUserProfile);
router.get("/", authenticateToken, requireAdmin, getUsers);
router.delete("/:id", authenticateToken, requireAdmin, deleteUserByAdmin);
router.put("/:id/toggle-active", authenticateToken, requireAdmin, toggleUserActive);

module.exports = router;
