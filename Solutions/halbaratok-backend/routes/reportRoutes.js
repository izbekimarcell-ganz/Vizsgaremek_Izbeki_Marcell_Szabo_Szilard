const express = require("express");
const {
  createForumReport,
  getAdminReportNotifications,
  getAdminReports,
  getAdminReportDetail,
  replyToReport,
  deleteAdminReport,
  getUserReportMessages,
  getUserReportMessageDetail,
  deleteUserReportMessage,
} = require("../controllers/reportController");
const { authenticateToken, requireAdmin } = require("../utils/auth");

const router = express.Router();

router.post("/forum", authenticateToken, createForumReport);
router.get("/admin/notifications", authenticateToken, requireAdmin, getAdminReportNotifications);
router.get("/admin", authenticateToken, requireAdmin, getAdminReports);
router.get("/admin/:reportId", authenticateToken, requireAdmin, getAdminReportDetail);
router.post("/admin/:reportId/reply", authenticateToken, requireAdmin, replyToReport);
router.delete("/admin/:reportId", authenticateToken, requireAdmin, deleteAdminReport);
router.get("/messages", authenticateToken, getUserReportMessages);
router.get("/messages/:reportId", authenticateToken, getUserReportMessageDetail);
router.delete("/messages/:reportId", authenticateToken, deleteUserReportMessage);

module.exports = router;
