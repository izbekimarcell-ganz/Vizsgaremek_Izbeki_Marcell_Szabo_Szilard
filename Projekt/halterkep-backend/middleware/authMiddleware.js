const jwt = require("jsonwebtoken");

// Alapvető auth middleware - ellenőrzi, hogy be van-e jelentkezve
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Nincs token megadva vagy hibas formatum.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, felhasznalonev }
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "A token lejart.",
      });
    }
    return res.status(401).json({
      message: "Ervenytelen token.",
    });
  }
};

// Admin jogosultság ellenőrzése
const verifyAdmin = async (req, res, next) => {
  try {
    const { sql, poolPromise } = require("../DbConfig");
    const pool = await poolPromise;

    // Ellenőrizzük, hogy a felhasználó rendelkezik-e Admin szerepkörrel
    const result = await pool
      .request()
      .input("felhasznaloId", sql.Int, req.user.id)
      .query(`
        SELECT fs.SzerepkorId, sz.Nev
        FROM dbo.FelhasznaloSzerepkor fs
        INNER JOIN dbo.Szerepkor sz ON fs.SzerepkorId = sz.SzerepkorId
        WHERE fs.FelhasznaloId = @felhasznaloId AND sz.Nev = 'Admin'
      `);

    if (result.recordset.length === 0) {
      return res.status(403).json({
        message: "Hozzaferes megtagadva. Admin jogosultsag szukseges.",
      });
    }

    next();
  } catch (error) {
    console.error("Admin ellenorzes hiba:", error);
    return res.status(500).json({
      message: "Szerverhiba tortent.",
    });
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
};
