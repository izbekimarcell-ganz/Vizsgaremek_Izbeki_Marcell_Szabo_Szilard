const express = require("express");
const {
  getUsers,
  toggleUserActive,
  searchUsers,
  getOwnProfile,
  getPublicUserProfile,
  updateOwnProfile,
  deleteUserByAdmin,
  updateOwnProfilePrivacy,
} = require("../controllers/userController");
const { authenticateToken, authenticateTokenOptional, requireAdmin } = require("../utils/auth");

const router = express.Router();

router.get("/search", searchUsers);
router.get("/me/profile", authenticateToken, getOwnProfile);
router.put("/me/profile", authenticateToken, updateOwnProfile);
router.put("/me/privacy", authenticateToken, updateOwnProfilePrivacy);
router.get("/:id/profile", authenticateTokenOptional, getPublicUserProfile);
router.get("/", authenticateToken, requireAdmin, getUsers);
router.delete("/:id", authenticateToken, requireAdmin, deleteUserByAdmin);
router.put("/:id/toggle-active", authenticateToken, requireAdmin, toggleUserActive);

module.exports = router;
