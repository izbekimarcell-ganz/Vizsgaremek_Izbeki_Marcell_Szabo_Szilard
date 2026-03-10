const express = require("express");
const router = express.Router();
const {
  getTemak,
  createTema,
  getHozzaszolasok,
  createHozzaszolas,
  deleteTema,
  deleteHozzaszolas,
} = require("../controllers/forumController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// Publikus: összes téma lekérése
router.get("/temak", getTemak);

// Védett: új téma létrehozása
router.post("/tema", verifyToken, createTema);

// Publikus: téma hozzászólásainak lekérése
router.get("/tema/:temaId/hozzaszolasok", getHozzaszolasok);

// Védett: új hozzászólás létrehozása
router.post("/hozzaszolas", verifyToken, createHozzaszolas);

// Admin: téma törlése
router.delete("/tema/:temaId", verifyToken, verifyAdmin, deleteTema);

// Admin: hozzászólás törlése
router.delete("/hozzaszolas/:hozzaszolasId", verifyToken, verifyAdmin, deleteHozzaszolas);

module.exports = router;