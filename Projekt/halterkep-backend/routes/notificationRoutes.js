const express = require("express");
const {
  getNotifications,
  getNotificationDetail,
  deleteNotification,
} = require("../controllers/notificationController");
const { authenticateToken } = require("../utils/auth");

const router = express.Router();

router.get("/", authenticateToken, getNotifications);
router.get("/:notificationId", authenticateToken, getNotificationDetail);
router.delete("/:notificationId", authenticateToken, deleteNotification);

module.exports = router;
