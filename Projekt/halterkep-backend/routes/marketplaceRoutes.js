const express = require("express");
const {
  getMarketplaceCategories,
  getMarketplaceListings,
  getMarketplaceListingById,
} = require("../controllers/marketplaceController");

const router = express.Router();

router.get("/categories", getMarketplaceCategories);
router.get("/listings", getMarketplaceListings);
router.get("/listings/:id", getMarketplaceListingById);

module.exports = router;
