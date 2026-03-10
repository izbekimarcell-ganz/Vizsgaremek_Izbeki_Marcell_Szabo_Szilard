const express = require("express");
const router = express.Router();
const {
  getHalfajok,
  getHalfajReszletek,
} = require("../controllers/halfajokController");

// Publikus: összes halfaj lekérése
router.get("/", getHalfajok);

// Publikus: egy halfaj részletes adatai
router.get("/:halfajId", getHalfajReszletek);

module.exports = router;
