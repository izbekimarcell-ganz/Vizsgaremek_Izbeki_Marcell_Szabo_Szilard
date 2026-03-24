const express = require("express");
const {
  getMarketplaceCategories,
  getMarketplaceListings,
  getMarketplaceListingById,
  getMarketplaceListingsForAdmin,
  getMarketplaceListingDetailForAdmin,
  createMarketplaceListing,
  updateMarketplaceListing,
  setMarketplaceListingFrozenState,
  setMarketplaceListingFrozenStateForAdmin,
  deleteMarketplaceListing,
  deleteMarketplaceListingForAdmin,
  createMarketplaceMessage,
  getMarketplaceMessages,
  getMarketplaceMessageDetail,
  replyToMarketplaceMessage,
  deleteMarketplaceMessage,
  createMarketplaceReport,
  getAdminMarketplaceReportNotifications,
  getAdminMarketplaceReports,
  getAdminMarketplaceReportDetail,
  replyToMarketplaceReport,
  deleteAdminMarketplaceReport,
  getUserMarketplaceReportMessages,
  getUserMarketplaceReportMessageDetail,
  deleteUserMarketplaceReportMessage,
} = require("../controllers/marketplaceController");
const { authenticateToken, requireAdmin } = require("../utils/auth");

const router = express.Router();

router.get("/categories", getMarketplaceCategories);
router.get("/listings", getMarketplaceListings);
router.get("/listings/:id", getMarketplaceListingById);

router.get("/admin/listings", authenticateToken, requireAdmin, getMarketplaceListingsForAdmin);
router.get("/admin/listings/:id", authenticateToken, requireAdmin, getMarketplaceListingDetailForAdmin);
router.patch("/admin/listings/:id/freeze", authenticateToken, requireAdmin, setMarketplaceListingFrozenStateForAdmin);
router.delete("/admin/listings/:id", authenticateToken, requireAdmin, deleteMarketplaceListingForAdmin);

router.post("/listings", authenticateToken, createMarketplaceListing);
router.put("/listings/:id", authenticateToken, updateMarketplaceListing);
router.patch("/listings/:id/freeze", authenticateToken, setMarketplaceListingFrozenState);
router.delete("/listings/:id", authenticateToken, deleteMarketplaceListing);
router.post("/listings/:id/messages", authenticateToken, createMarketplaceMessage);
router.post("/listings/:id/report", authenticateToken, createMarketplaceReport);

router.get("/messages", authenticateToken, getMarketplaceMessages);
router.get("/messages/:messageId", authenticateToken, getMarketplaceMessageDetail);
router.post("/messages/:messageId/reply", authenticateToken, replyToMarketplaceMessage);
router.delete("/messages/:messageId", authenticateToken, deleteMarketplaceMessage);

router.get("/reports/admin/notifications", authenticateToken, requireAdmin, getAdminMarketplaceReportNotifications);
router.get("/reports/admin", authenticateToken, requireAdmin, getAdminMarketplaceReports);
router.get("/reports/admin/:reportId", authenticateToken, requireAdmin, getAdminMarketplaceReportDetail);
router.post("/reports/admin/:reportId/reply", authenticateToken, requireAdmin, replyToMarketplaceReport);
router.delete("/reports/admin/:reportId", authenticateToken, requireAdmin, deleteAdminMarketplaceReport);

router.get("/reports/messages", authenticateToken, getUserMarketplaceReportMessages);
router.get("/reports/messages/:reportId", authenticateToken, getUserMarketplaceReportMessageDetail);
router.delete("/reports/messages/:reportId", authenticateToken, deleteUserMarketplaceReportMessage);

module.exports = router;
