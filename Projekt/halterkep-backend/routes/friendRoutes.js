const express = require("express");
const {
  getFriendOverview,
  sendFriendRequest,
  getFriendNotifications,
  respondToFriendRequest,
  removeFriend,
} = require("../controllers/friendController");
const { authenticateToken } = require("../utils/auth");

const router = express.Router();

router.get("/overview", authenticateToken, getFriendOverview);
router.get("/notifications", authenticateToken, getFriendNotifications);
router.post("/requests", authenticateToken, sendFriendRequest);
router.put("/requests/:id/respond", authenticateToken, respondToFriendRequest);
router.delete("/relations/:userId", authenticateToken, removeFriend);

module.exports = router;

