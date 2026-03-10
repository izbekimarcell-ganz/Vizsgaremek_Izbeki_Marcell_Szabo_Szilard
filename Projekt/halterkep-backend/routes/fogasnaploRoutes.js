const express = require("express");
const router = express.Router();
const {
  getFogasok
} = require("../controllers/fogasnaploController");

router.get("/", getFogasok);

module.exports = router;