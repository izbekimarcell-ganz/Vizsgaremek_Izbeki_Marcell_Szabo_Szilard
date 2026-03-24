const express = require("express");
const { getOwnCatches, getUserProfileCatches, createCatch, updateOwnCatch, deleteOwnCatch } = require("../controllers/catchLogController");
const { authenticateToken, authenticateTokenOptional } = require("../utils/auth");

const router = express.Router();

router.get("/sajat", authenticateToken, getOwnCatches);
router.get("/felhasznalo/:userId", authenticateTokenOptional, getUserProfileCatches);
router.post("/", authenticateToken, createCatch);
router.put("/:id", authenticateToken, updateOwnCatch);
router.delete("/:id", authenticateToken, deleteOwnCatch);

module.exports = router;

