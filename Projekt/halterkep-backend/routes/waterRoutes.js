const express = require("express");
const {
  getWaters,
  getWaterDetails,
  getCounties,
  getWaterTypes,
} = require("../controllers/waterController");

const router = express.Router();

router.get("/", getWaters);
router.get("/megyek", getCounties);
router.get("/viztipusok", getWaterTypes);
router.get("/:id", getWaterDetails);

module.exports = router;
