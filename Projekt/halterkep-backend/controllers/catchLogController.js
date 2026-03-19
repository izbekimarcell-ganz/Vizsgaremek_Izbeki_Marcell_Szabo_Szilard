const { sql, poolPromise } = require("../DbConfig");
const { getProfileVisibility } = require("../utils/profileVisibility");

async function getCatchesForUserId(userId) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .query(`
      SELECT
        f.FogasId,
        f.FogasIdeje,
        f.SulyKg,
        f.HosszCm,
        f.FotoUrl,
        f.Megjegyzes,
        h.MagyarNev AS HalfajNev,
        v.Nev AS VizteruletNev
      FROM FogasNaplo f
      INNER JOIN Halfaj h ON h.HalfajId = f.HalfajId
      INNER JOIN Vizterulet v ON v.VizteruletId = f.VizteruletId
      WHERE f.FelhasznaloId = @userId
      ORDER BY f.FogasIdeje DESC, f.FogasId DESC
    `);

  return result.recordset;
}

async function getOwnCatches(req, res) {
  try {
    const catches = await getCatchesForUserId(req.user.id);
    return res.status(200).json(catches);
  } catch (error) {
    console.error("Sajat fogasok lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a fogások lekérésekor.",
    });
  }
}

async function getUserProfileCatches(req, res) {
  try {
    const userId = Number.parseInt(req.params.userId, 10);

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

    const catches = await getCatchesForUserId(userId);
    return res.status(200).json(catches);
  } catch (error) {
    console.error("Profil fogasok lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a fogások lekérésekor.",
    });
  }
}

async function createCatch(req, res) {
  try {
    const { halfajId, vizteruletId, fogasIdeje, sulyKg, hosszCm, fotoUrl, megjegyzes } = req.body;

    if (!halfajId || !vizteruletId || !fogasIdeje) {
      return res.status(400).json({
        message: "A halfaj, a vízterület és a fogás ideje kötelező.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("felhasznaloId", sql.Int, req.user.id)
      .input("halfajId", sql.Int, parseInt(halfajId, 10))
      .input("vizteruletId", sql.Int, parseInt(vizteruletId, 10))
      .input("fogasIdeje", sql.DateTime2, new Date(fogasIdeje))
      .input("sulyKg", sql.Decimal(5, 2), sulyKg ?? null)
      .input("hosszCm", sql.Int, hosszCm ?? null)
      .input("fotoUrl", sql.NVarChar(sql.MAX), fotoUrl || null)
      .input("megjegyzes", sql.NVarChar(500), megjegyzes || null)
      .query(`
        INSERT INTO FogasNaplo
          (FelhasznaloId, HalfajId, VizteruletId, FogasIdeje, SulyKg, HosszCm, FotoUrl, Megjegyzes)
        OUTPUT INSERTED.FogasId
        VALUES
          (@felhasznaloId, @halfajId, @vizteruletId, @fogasIdeje, @sulyKg, @hosszCm, @fotoUrl, @megjegyzes)
      `);

    return res.status(201).json({
      message: "Fogás sikeresen rögzítve.",
      fogasId: result.recordset[0].FogasId,
    });
  } catch (error) {
    console.error("Fogas rogzitese hiba:", error);
    return res.status(500).json({
      message: "Hiba a fogás rögzítése közben.",
    });
  }
}

async function deleteOwnCatch(req, res) {
  try {
    const fogasId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(fogasId)) {
      return res.status(400).json({
        message: "Érvénytelen fogás azonosító.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("fogasId", sql.Int, fogasId)
      .input("felhasznaloId", sql.Int, req.user.id)
      .query(`
        DELETE FROM FogasNaplo
        OUTPUT DELETED.FogasId
        WHERE FogasId = @fogasId
          AND FelhasznaloId = @felhasznaloId
      `);

    if (!result.recordset.length) {
      return res.status(404).json({
        message: "A fogás nem található, vagy nincs jogod törölni.",
      });
    }

    return res.status(200).json({
      message: "Fogás sikeresen törölve.",
    });
  } catch (error) {
    console.error("Fogas torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a fogás törlése közben.",
    });
  }
}

module.exports = {
  getOwnCatches,
  getUserProfileCatches,
  createCatch,
  deleteOwnCatch,
};
