const express = require("express");
const {
  getTopics,
  createTopic,
  getTopicReplies,
  createReply,
} = require("../controllers/forumController");
const { authenticateToken } = require("../utils/auth");

const router = express.Router();

router.get("/temak", getTopics);
router.post("/tema", authenticateToken, createTopic);
router.get("/tema/:temaId/hozzaszolasok", getTopicReplies);
router.post("/hozzaszolas", authenticateToken, createReply);

module.exports = router;
