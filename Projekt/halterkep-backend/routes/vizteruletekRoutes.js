const express = require("express");
const router = express.Router();
const {
  getVizteruletek,
  getVizteruletReszletek,
} = require("../controllers/vizteruletekController");

// Publikus: vízterületek lekérése (szűréssel)
router.get("/", getVizteruletek);

// Publikus: egy vízterület részletes adatai
router.get("/:vizteruletId", getVizteruletReszletek);

module.exports = router;