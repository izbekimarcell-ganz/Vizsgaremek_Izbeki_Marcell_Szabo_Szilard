const express = require("express");
const { getOwnCatches, createCatch } = require("../controllers/catchLogController");
const { authenticateToken } = require("../utils/auth");

const router = express.Router();

router.get("/sajat", authenticateToken, getOwnCatches);
router.post("/", authenticateToken, createCatch);

module.exports = router;
