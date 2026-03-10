const express = require("express");
const router = express.Router();
const {
  getFogasok,
  addFogas,
  getSajatFogasok,
} = require("../controllers/fogasnaploController");
const { verifyToken } = require("../middleware/authMiddleware");

// Publikus: összes fogás lekérése (szűréssel)
router.get("/", getFogasok);

// Védett: új fogás rögzítése
router.post("/", verifyToken, addFogas);

// Védett: saját fogások lekérése
router.get("/sajat", verifyToken, getSajatFogasok);

module.exports = router;