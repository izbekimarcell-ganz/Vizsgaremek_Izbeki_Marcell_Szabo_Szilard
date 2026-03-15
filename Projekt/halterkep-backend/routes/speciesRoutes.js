const express = require("express");
const {
  getSpecies,
  createSpecies,
  updateSpecies,
  deleteSpecies,
} = require("../controllers/speciesController");
const { authenticateToken, requireAdmin } = require("../utils/auth");

const router = express.Router();

router.get("/", getSpecies);
router.post("/", authenticateToken, requireAdmin, createSpecies);
router.put("/:id", authenticateToken, requireAdmin, updateSpecies);
router.delete("/:id", authenticateToken, requireAdmin, deleteSpecies);

module.exports = router;
