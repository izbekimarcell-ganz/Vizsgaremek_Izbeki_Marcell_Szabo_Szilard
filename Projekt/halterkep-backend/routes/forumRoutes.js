const express = require("express");
const {
  getTopics,
  createTopic,
  getTopicReplies,
  createReply,
  getTopicsForAdmin,
  getRepliesForAdmin,
  deleteTopic,
  deleteReply,
} = require("../controllers/forumController");
const { authenticateToken, requireAdmin } = require("../utils/auth");

const router = express.Router();

router.get("/temak", getTopics);
router.post("/tema", authenticateToken, createTopic);
router.get("/tema/:temaId/hozzaszolasok", getTopicReplies);
router.post("/hozzaszolas", authenticateToken, createReply);
router.get("/admin/temak", authenticateToken, requireAdmin, getTopicsForAdmin);
router.get(
  "/admin/tema/:temaId/hozzaszolasok",
  authenticateToken,
  requireAdmin,
  getRepliesForAdmin
);
router.delete("/admin/tema/:temaId", authenticateToken, requireAdmin, deleteTopic);
router.delete(
  "/admin/hozzaszolas/:hozzaszolasId",
  authenticateToken,
  requireAdmin,
  deleteReply
);

module.exports = router;

