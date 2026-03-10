const express = require("express");
const router = express.Router();
const {
  getProfile,
  getAllUsers,
  toggleUserActive,
  addRoleToUser,
  removeRoleFromUser,
  getAllRoles,
} = require("../controllers/usersController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// Védett: saját profil lekérése
router.get("/profile", verifyToken, getProfile);

// Admin: összes felhasználó listázása
router.get("/", verifyToken, verifyAdmin, getAllUsers);

// Admin: felhasználó aktiválása/tiltása
router.put("/:userId/toggle-active", verifyToken, verifyAdmin, toggleUserActive);

// Admin: szerepkör hozzáadása
router.post("/:userId/role", verifyToken, verifyAdmin, addRoleToUser);

// Admin: szerepkör eltávolítása
router.delete("/:userId/role/:szerepkorId", verifyToken, verifyAdmin, removeRoleFromUser);

// Publikus: szerepkörök listázása
router.get("/roles", getAllRoles);

module.exports = router;
