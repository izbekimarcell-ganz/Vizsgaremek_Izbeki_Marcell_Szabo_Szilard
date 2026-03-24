const express = require("express");
const {
  getWaters,
  getWaterDetails,
  getCounties,
  getWaterTypes,
  createWater,
  updateWater,
  deleteWater,
  getWaterRelations,
  updateWaterRelations,
} = require("../controllers/waterController");
const { authenticateToken, requireAdmin } = require("../utils/auth");

const router = express.Router();

router.get("/", getWaters);
router.post("/", authenticateToken, requireAdmin, createWater);
router.get("/megyek", getCounties);
router.get("/viztipusok", getWaterTypes);
router.get("/:id/kapcsolatok", authenticateToken, requireAdmin, getWaterRelations);
router.put("/:id/kapcsolatok", authenticateToken, requireAdmin, updateWaterRelations);
router.put("/:id", authenticateToken, requireAdmin, updateWater);
router.delete("/:id", authenticateToken, requireAdmin, deleteWater);
router.get("/:id", getWaterDetails);

module.exports = router;

