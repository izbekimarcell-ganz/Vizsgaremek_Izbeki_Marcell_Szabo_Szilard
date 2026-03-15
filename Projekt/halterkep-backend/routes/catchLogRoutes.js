const express = require("express");
const { getOwnCatches, createCatch, deleteOwnCatch } = require("../controllers/catchLogController");
const { authenticateToken } = require("../utils/auth");

const router = express.Router();

router.get("/sajat", authenticateToken, getOwnCatches);
router.post("/", authenticateToken, createCatch);
router.delete("/:id", authenticateToken, deleteOwnCatch);

module.exports = router;
