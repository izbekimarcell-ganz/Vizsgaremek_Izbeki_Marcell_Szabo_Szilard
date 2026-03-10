const { sql, poolPromise } = require("../DbConfig");

// Felhasználó profiljának lekérése
const getProfile = async (req, res) => {
  try {
    const felhasznaloId = req.user.id;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("felhasznaloId", sql.Int, felhasznaloId)
      .query(`
        SELECT
          f.FelhasznaloId,
          f.Felhasznalonev,
          f.Email,
          f.Letrehozva,
          f.Aktiv
        FROM dbo.Felhasznalo f
        WHERE f.FelhasznaloId = @felhasznaloId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Felhasznalo nem talalhato." });
    }

    // Szerepkörök lekérése
    const szerepkorResult = await pool
      .request()
      .input("felhasznaloId", sql.Int, felhasznaloId)
      .query(`
        SELECT sz.SzerepkorId, sz.Nev
        FROM dbo.FelhasznaloSzerepkor fs
        INNER JOIN dbo.Szerepkor sz ON fs.SzerepkorId = sz.SzerepkorId
        WHERE fs.FelhasznaloId = @felhasznaloId
      `);

    res.json({
      felhasznalo: result.recordset[0],
      szerepkorok: szerepkorResult.recordset,
    });
  } catch (error) {
    console.error("Profil lekeres hiba:", error);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

// Admin: összes felhasználó listázása
const getAllUsers = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        f.FelhasznaloId,
        f.Felhasznalonev,
        f.Email,
        f.Letrehozva,
        f.Aktiv,
        STRING_AGG(sz.Nev, ', ') AS Szerepkorok
      FROM dbo.Felhasznalo f
      LEFT JOIN dbo.FelhasznaloSzerepkor fs ON f.FelhasznaloId = fs.FelhasznaloId
      LEFT JOIN dbo.Szerepkor sz ON fs.SzerepkorId = sz.SzerepkorId
      GROUP BY f.FelhasznaloId, f.Felhasznalonev, f.Email, f.Letrehozva, f.Aktiv
      ORDER BY f.Letrehozva DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Felhasznalok lekeres hiba:", error);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

// Admin: felhasználó aktiválása/tiltása
const toggleUserActive = async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await poolPromise;

    // Ellenőrizzük, hogy létezik-e a felhasználó
    const userCheck = await pool
      .request()
      .input("userId", sql.Int, parseInt(userId))
      .query(`SELECT FelhasznaloId, Aktiv FROM dbo.Felhasznalo WHERE FelhasznaloId = @userId`);

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ message: "Felhasznalo nem talalhato." });
    }

    const currentStatus = userCheck.recordset[0].Aktiv;
    const newStatus = !currentStatus;

    await pool
      .request()
      .input("userId", sql.Int, parseInt(userId))
      .input("aktiv", sql.Bit, newStatus)
      .query(`UPDATE dbo.Felhasznalo SET Aktiv = @aktiv WHERE FelhasznaloId = @userId`);

    res.json({
      message: `Felhasznalo sikeresen ${newStatus ? "aktivalva" : "tiltva"}.`,
      aktiv: newStatus,
    });
  } catch (error) {
    console.error("Felhasznalo aktivalas/tiltas hiba:", error);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

// Admin: szerepkör hozzáadása felhasználóhoz
const addRoleToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { szerepkorId } = req.body;

    if (!szerepkorId) {
      return res.status(400).json({ message: "A szerepkorId kotelezo." });
    }

    const pool = await poolPromise;

    // Ellenőrizzük, hogy már van-e ilyen kapcsolat
    const exists = await pool
      .request()
      .input("userId", sql.Int, parseInt(userId))
      .input("szerepkorId", sql.Int, parseInt(szerepkorId))
      .query(`
        SELECT * FROM dbo.FelhasznaloSzerepkor 
        WHERE FelhasznaloId = @userId AND SzerepkorId = @szerepkorId
      `);

    if (exists.recordset.length > 0) {
      return res.status(409).json({ message: "A felhasznalo mar rendelkezik ezzel a szerepkorrel." });
    }

    await pool
      .request()
      .input("userId", sql.Int, parseInt(userId))
      .input("szerepkorId", sql.Int, parseInt(szerepkorId))
      .query(`
        INSERT INTO dbo.FelhasznaloSzerepkor (FelhasznaloId, SzerepkorId)
        VALUES (@userId, @szerepkorId)
      `);

    res.status(201).json({ message: "Szerepkor sikeresen hozzaadva." });
  } catch (error) {
    console.error("Szerepkor hozzaadas hiba:", error);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

// Admin: szerepkör eltávolítása felhasználótól
const removeRoleFromUser = async (req, res) => {
  try {
    const { userId, szerepkorId } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("userId", sql.Int, parseInt(userId))
      .input("szerepkorId", sql.Int, parseInt(szerepkorId))
      .query(`
        DELETE FROM dbo.FelhasznaloSzerepkor 
        WHERE FelhasznaloId = @userId AND SzerepkorId = @szerepkorId
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "A kapcsolat nem talalhato." });
    }

    res.json({ message: "Szerepkor sikeresen eltavolitva." });
  } catch (error) {
    console.error("Szerepkor eltavolitas hiba:", error);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

// Összes szerepkör lekérése
const getAllRoles = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT SzerepkorId, Nev
      FROM dbo.Szerepkor
      ORDER BY Nev
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Szerepkorok lekeres hiba:", error);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

module.exports = {
  getProfile,
  getAllUsers,
  toggleUserActive,
  addRoleToUser,
  removeRoleFromUser,
  getAllRoles,
};
