const express = require("express");
const router = express.Router();
const {
  getTemak
} = require("../controllers/forumController");

router.get("/temak", getTemak);

module.exports = router;