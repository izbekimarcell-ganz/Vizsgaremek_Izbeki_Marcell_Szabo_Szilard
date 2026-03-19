const express = require("express");
const {
  getOwnFishingDays,
  getUserProfileFishingDays,
  addFishingDay,
  deleteFishingDay,
  saveFishingDayNote,
} = require("../controllers/fishingDayController");
const { authenticateToken, authenticateTokenOptional } = require("../utils/auth");

const router = express.Router();

router.get("/sajat", authenticateToken, getOwnFishingDays);
router.get("/felhasznalo/:userId", authenticateTokenOptional, getUserProfileFishingDays);
router.put("/:dateKey", authenticateToken, addFishingDay);
router.put("/:dateKey/megjegyzes", authenticateToken, saveFishingDayNote);
router.delete("/:dateKey", authenticateToken, deleteFishingDay);

module.exports = router;
