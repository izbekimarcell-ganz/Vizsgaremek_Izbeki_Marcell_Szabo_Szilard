const { sql, poolPromise } = require("../DbConfig");

async function getUsers(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT FelhasznaloId, Felhasznalonev, Email, Admin, Aktiv, Letrehozva
      FROM Felhasznalo
      WHERE Admin = 0
      ORDER BY Admin DESC, Felhasznalonev
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Felhasznalok lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a felhasznalok lekeresekor.",
    });
  }
}

async function toggleUserActive(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        message: "Ervenytelen felhasznalo azonosito.",
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        message: "A sajat fiokod allapota innen nem modositthato.",
      });
    }

    const pool = await poolPromise;
    const existing = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT FelhasznaloId, Admin, Aktiv
        FROM Felhasznalo
        WHERE FelhasznaloId = @userId
      `);

    const user = existing.recordset[0];

    if (!user) {
      return res.status(404).json({
        message: "Felhasznalo nem talalhato.",
      });
    }

    if (user.Admin) {
      return res.status(403).json({
        message: "Admin fiok allapota itt nem modositthato.",
      });
    }

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        UPDATE Felhasznalo
        SET Aktiv = CASE WHEN Aktiv = 1 THEN 0 ELSE 1 END
        OUTPUT INSERTED.FelhasznaloId, INSERTED.Aktiv
        WHERE FelhasznaloId = @userId
      `);

    return res.status(200).json({
      message: "Felhasznalo allapota modositva.",
      user: result.recordset[0],
    });
  } catch (error) {
    console.error("Felhasznalo allapot modositasi hiba:", error);
    return res.status(500).json({
      message: "Hiba a felhasznalo allapotanak modositasakor.",
    });
  }
}

module.exports = {
  getUsers,
  toggleUserActive,
};
