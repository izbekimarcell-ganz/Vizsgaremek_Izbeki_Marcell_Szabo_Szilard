const express = require("express");
const {
  getFriendOverview,
  sendFriendRequest,
  getFriendNotifications,
  createFriendMessage,
  getFriendMessages,
  getFriendMessageDetail,
  replyToFriendMessage,
  deleteFriendMessage,
  respondToFriendRequest,
  removeFriend,
} = require("../controllers/friendController");
const { authenticateToken } = require("../utils/auth");

const router = express.Router();

router.get("/overview", authenticateToken, getFriendOverview);
router.get("/notifications", authenticateToken, getFriendNotifications);
router.post("/messages", authenticateToken, createFriendMessage);
router.get("/messages", authenticateToken, getFriendMessages);
router.get("/messages/:messageId", authenticateToken, getFriendMessageDetail);
router.post("/messages/:messageId/reply", authenticateToken, replyToFriendMessage);
router.delete("/messages/:messageId", authenticateToken, deleteFriendMessage);
router.post("/requests", authenticateToken, sendFriendRequest);
router.put("/requests/:id/respond", authenticateToken, respondToFriendRequest);
router.delete("/relations/:userId", authenticateToken, removeFriend);

module.exports = router;

