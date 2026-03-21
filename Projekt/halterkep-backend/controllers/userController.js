const { sql, poolPromise } = require("../DbConfig");
const { getProfileVisibility } = require("../utils/profileVisibility");

function mapProfileUser(user, { includeEmail = false } = {}) {
  return {
    id: user.FelhasznaloId,
    username: user.Felhasznalonev,
    email: includeEmail ? user.Email : undefined,
    profileImageUrl: user.ProfilKepUrl || null,
    bio: user.Bemutatkozas || "",
    letrehozva: user.Letrehozva,
    aktiv: Boolean(user.Aktiv),
    admin: Boolean(user.Admin),
    private: Boolean(user.Privat),
  };
}

function normalizeProfileImageUrl(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  const isDataImage = /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(normalized);
  const isHttpImage = /^https?:\/\//i.test(normalized);

  if (!isDataImage && !isHttpImage) {
    throw new Error("A profilkep csak ervenyes kep URL vagy feltoltott kep lehet.");
  }

  return normalized;
}

function normalizeBio(value) {
  return String(value || "").trim().slice(0, 1000);
}

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
      message: "Hiba a felhasználók lekérésekor.",
    });
  }
}

async function toggleUserActive(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        message: "Érvénytelen felhasználó azonosító.",
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        message: "A saját fiókod állapota innen nem módosítható.",
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
        message: "Felhasználó nem található.",
      });
    }

    if (user.Admin) {
      return res.status(403).json({
        message: "Admin fiók állapota itt nem módosítható.",
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
      message: "Felhasználó állapota módosítva.",
      user: result.recordset[0],
    });
  } catch (error) {
    console.error("Felhasznalo allapot modositasi hiba:", error);
    return res.status(500).json({
      message: "Hiba a felhasználó állapotának módosításakor.",
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

          DELETE FROM BaratUzenet
          WHERE KuldoFelhasznaloId = @userId
             OR CimzettFelhasznaloId = @userId;

          DELETE FROM ForumHozzaszolas
          WHERE FelhasznaloId = @userId;

          DELETE FROM ForumTema
          WHERE FelhasznaloId = @userId;

          DELETE FROM ForumReport
          WHERE FelhasznaloId = @userId;

          DELETE FROM MarketplaceHirdetes
          WHERE FelhasznaloId = @userId;

          DELETE FROM FogasNaplo
          WHERE FelhasznaloId = @userId;

          DELETE FROM HorgaszNap
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
      message: "Hiba a felhasználó keresésekor.",
    });
  }
}

async function getPublicUserProfile(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        message: "Érvénytelen felhasználó azonosító.",
      });
    }

    const profileAccess = await getProfileVisibility(userId, req.user);

    if (!profileAccess) {
      return res.status(404).json({
        message: "Felhasználó nem található.",
      });
    }

    if (!profileAccess.canView) {
      return res.status(403).json({
        message: "Privát fiók.",
        privateProfile: true,
      });
    }

    const { user, isFriend, isPrivate } = profileAccess;

    return res.status(200).json({
      ...mapProfileUser(user, { includeEmail: false }),
      admin: false,
      private: isPrivate,
      isFriend,
    });
  } catch (error) {
    console.error("Nyilvános profil lekérési hiba:", error);
    return res.status(500).json({
      message: "Hiba a profil lekérésekor.",
    });
  }
}

async function getOwnProfile(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezés szükséges.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT
          FelhasznaloId,
          Felhasznalonev,
          Email,
          ProfilKepUrl,
          Bemutatkozas,
          Admin,
          Aktiv,
          Letrehozva,
          Privat
        FROM Felhasznalo
        WHERE FelhasznaloId = @userId
      `);

    const user = result.recordset[0];

    if (!user) {
      return res.status(404).json({
        message: "Felhasználó nem található.",
      });
    }

    return res.status(200).json(mapProfileUser(user, { includeEmail: true }));
  } catch (error) {
    console.error("Saját profil lekérési hiba:", error);
    return res.status(500).json({
      message: "Hiba a profil lekérésekor.",
    });
  }
}

async function updateOwnProfile(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezés szükséges.",
      });
    }

    let profileImageUrl;

    try {
      profileImageUrl = normalizeProfileImageUrl(req.body?.profileImageUrl);
    } catch (validationError) {
      return res.status(400).json({
        message: validationError.message,
      });
    }

    const bio = normalizeBio(req.body?.bio);
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("profileImageUrl", sql.NVarChar(sql.MAX), profileImageUrl)
      .input("bio", sql.NVarChar(1000), bio || null)
      .query(`
        UPDATE Felhasznalo
        SET
          ProfilKepUrl = @profileImageUrl,
          Bemutatkozas = @bio
        OUTPUT
          INSERTED.FelhasznaloId,
          INSERTED.Felhasznalonev,
          INSERTED.Email,
          INSERTED.ProfilKepUrl,
          INSERTED.Bemutatkozas,
          INSERTED.Admin,
          INSERTED.Aktiv,
          INSERTED.Letrehozva,
          INSERTED.Privat
        WHERE FelhasznaloId = @userId
      `);

    const user = result.recordset[0];

    if (!user) {
      return res.status(404).json({
        message: "Felhasználó nem található.",
      });
    }

    return res.status(200).json({
      message: "A profil sikeresen frissítve.",
      user: mapProfileUser(user, { includeEmail: true }),
    });
  } catch (error) {
    console.error("Profil frissítési hiba:", error);
    return res.status(500).json({
      message: "Hiba a profil frissítésekor.",
    });
  }
}

async function updateOwnProfilePrivacy(req, res) {
  try {
    const isPrivate = Boolean(req.body?.private);
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.id)
      .input("private", sql.Bit, isPrivate)
      .query(`
        UPDATE Felhasznalo
        SET Privat = @private
        OUTPUT
          INSERTED.FelhasznaloId,
          INSERTED.Felhasznalonev,
          INSERTED.Email,
          INSERTED.ProfilKepUrl,
          INSERTED.Bemutatkozas,
          INSERTED.Admin,
          INSERTED.Aktiv,
          INSERTED.Letrehozva,
          INSERTED.Privat
        WHERE FelhasznaloId = @userId
      `);

    const user = result.recordset[0];

    if (!user) {
      return res.status(404).json({
        message: "Felhasználó nem található.",
      });
    }

    return res.status(200).json({
      message: isPrivate
        ? "A profil sikeresen privátra állítva."
        : "A profil sikeresen nyilvánosra állítva.",
      user: {
        id: user.FelhasznaloId,
        username: user.Felhasznalonev,
        email: user.Email,
        profileImageUrl: user.ProfilKepUrl || null,
        bio: user.Bemutatkozas || "",
        admin: Boolean(user.Admin),
        aktiv: Boolean(user.Aktiv),
        letrehozva: user.Letrehozva,
        private: Boolean(user.Privat),
      },
    });
  } catch (error) {
    console.error("Profil láthatóság módosítási hiba:", error);
    return res.status(500).json({
      message: "Hiba a profil láthatóságának módosításakor.",
    });
  }
}

module.exports = {
  getUsers,
  toggleUserActive,
  deleteUserByAdmin,
  searchUsers,
  getOwnProfile,
  getPublicUserProfile,
  updateOwnProfile,
  updateOwnProfilePrivacy,
};
