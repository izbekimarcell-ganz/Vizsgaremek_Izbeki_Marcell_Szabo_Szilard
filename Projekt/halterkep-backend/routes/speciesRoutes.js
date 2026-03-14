const express = require("express");
const { getSpecies } = require("../controllers/speciesController");

const router = express.Router();

router.get("/", getSpecies);

module.exports = router;
