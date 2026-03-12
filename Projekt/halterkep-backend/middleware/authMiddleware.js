const jwt = require("jsonwebtoken");
const { sql, getPool } = require("../DbConfig");

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
    const felhasznaloId = req.user.id;
    const pool = await getPool();

    const schemaResult = await pool.request().query(`
      SELECT
        CASE WHEN COL_LENGTH('dbo.Felhasznalo', 'SzerepkorId') IS NULL THEN 0 ELSE 1 END AS hasSzerepkorId,
        CASE WHEN COL_LENGTH('dbo.Felhasznalo', 'Admin') IS NULL THEN 0 ELSE 1 END AS hasAdminColumn,
        CASE WHEN OBJECT_ID('dbo.Szerepkor', 'U') IS NULL THEN 0 ELSE 1 END AS hasSzerepkorTable
    `);

    const schemaInfo = {
      hasSzerepkorId: schemaResult.recordset[0].hasSzerepkorId === 1,
      hasAdminColumn: schemaResult.recordset[0].hasAdminColumn === 1,
      hasSzerepkorTable: schemaResult.recordset[0].hasSzerepkorTable === 1,
    };

    let result;

    if (schemaInfo.hasSzerepkorId && schemaInfo.hasSzerepkorTable) {
      result = await pool
        .request()
        .input("felhasznaloId", sql.Int, felhasznaloId)
        .query(`
          SELECT COUNT(*) AS adminCount
          FROM dbo.Felhasznalo f
          INNER JOIN dbo.Szerepkor sz ON f.SzerepkorId = sz.SzerepkorId
          WHERE f.FelhasznaloId = @felhasznaloId AND sz.Nev = 'Admin'
        `);
    } else if (schemaInfo.hasAdminColumn) {
      result = await pool
        .request()
        .input("felhasznaloId", sql.Int, felhasznaloId)
        .query(`
          SELECT COUNT(*) AS adminCount
          FROM dbo.Felhasznalo
          WHERE FelhasznaloId = @felhasznaloId AND Admin = 1
        `);
    } else {
      result = { recordset: [{ adminCount: 0 }] };
    }

    const isAdmin = result.recordset[0].adminCount > 0;

    if (!isAdmin) {
      return res.status(403).json({
        message: "Nincs jogosultsag ehhez a muvelethez.",
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