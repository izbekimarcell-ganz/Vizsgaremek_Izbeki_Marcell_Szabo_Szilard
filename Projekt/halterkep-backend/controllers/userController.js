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

async function deleteUserByAdmin(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        message: "Érvénytelen felhasználó azonosító.",
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        message: "A saját fiókod innen nem törölhető.",
      });
    }

    const pool = await poolPromise;
    const existing = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT FelhasznaloId, Felhasznalonev, Admin, Aktiv
        FROM Felhasznalo
        WHERE FelhasznaloId = @userId
      `);

    const user = existing.recordset[0];

    if (!user) {
      return res.status(404).json({
        message: "Felhasználó nem található.",
      });
    }

    if (user.Admin) {
      return res.status(403).json({
        message: "Admin fiók nem törölhető.",
      });
    }

    if (user.Aktiv) {
      return res.status(400).json({
        message: "Csak tiltott fiók törölhető.",
      });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input("userId", sql.Int, userId)
        .query(`
          DELETE FROM BaratKerelem
          WHERE KezdemenyezoFelhasznaloId = @userId
             OR CimzettFelhasznaloId = @userId;

          DELETE FROM ForumHozzaszolas
          WHERE FelhasznaloId = @userId;

          DELETE FROM ForumTema
          WHERE FelhasznaloId = @userId;

          DELETE FROM FogasNaplo
          WHERE FelhasznaloId = @userId;

          DELETE FROM Felhasznalo
          WHERE FelhasznaloId = @userId;
        `);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return res.status(200).json({
      message: "Felhasználó sikeresen törölve.",
      deletedUser: {
        id: user.FelhasznaloId,
        username: user.Felhasznalonev,
      },
    });
  } catch (error) {
    console.error("Admin felhasznalo torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a felhasználó törlésekor.",
    });
  }
}

async function searchUsers(req, res) {
  try {
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";

    if (query.length < 1) {
      return res.status(200).json([]);
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("query", sql.NVarChar(100), `%${query}%`)
      .query(`
        SELECT TOP 10 FelhasznaloId, Felhasznalonev
        FROM Felhasznalo
        WHERE Aktiv = 1
          AND Admin = 0
          AND Felhasznalonev LIKE @query
        ORDER BY Felhasznalonev ASC
      `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Felhasznalo kereses hiba:", error);
    return res.status(500).json({
      message: "Hiba a felhasznalo keresesekor.",
    });
  }
}

async function getPublicUserProfile(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    const isAdminViewer = Boolean(req.user?.admin);

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        message: "Ervenytelen felhasznalo azonosito.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("isAdminViewer", sql.Bit, isAdminViewer)
      .query(`
        SELECT FelhasznaloId, Felhasznalonev, Letrehozva, Aktiv
        FROM Felhasznalo
        WHERE FelhasznaloId = @userId
          AND Admin = 0
          AND (@isAdminViewer = 1 OR Aktiv = 1)
      `);

    const user = result.recordset[0];

    if (!user) {
      return res.status(404).json({
        message: "Felhasznalo nem talalhato.",
      });
    }

    return res.status(200).json({
      id: user.FelhasznaloId,
      username: user.Felhasznalonev,
      letrehozva: user.Letrehozva,
      aktiv: Boolean(user.Aktiv),
      admin: false,
    });
  } catch (error) {
    console.error("Nyilvanos profil lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a profil lekeresekor.",
    });
  }
}

module.exports = {
  getUsers,
  toggleUserActive,
  deleteUserByAdmin,
  searchUsers,
  getPublicUserProfile,
};
