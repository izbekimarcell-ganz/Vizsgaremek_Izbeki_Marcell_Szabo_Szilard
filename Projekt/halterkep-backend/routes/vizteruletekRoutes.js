const express = require("express");
const router = express.Router();
const {
  getVizteruletek
} = require("../controllers/vizteruletekController");

router.get("/", getVizteruletek);

module.exports = router;