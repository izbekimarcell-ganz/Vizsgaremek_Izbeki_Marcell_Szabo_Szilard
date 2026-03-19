const { sql, poolPromise } = require("../DbConfig");
const { getProfileVisibility } = require("../utils/profileVisibility");

function normalizeDateKey(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

async function getManualFishingDaysForUserId(userId) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .query(`
      SELECT
        CONVERT(VARCHAR(10), Datum, 23) AS Datum,
        Megjegyzes
      FROM HorgaszNap
      WHERE FelhasznaloId = @userId
      ORDER BY Datum DESC
    `);

  return result.recordset;
}

async function countCatchesOnDate(userId, dateKey) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("datum", sql.Date, dateKey)
    .query(`
      SELECT COUNT(*) AS FogasokSzama
      FROM FogasNaplo
      WHERE FelhasznaloId = @userId
        AND CAST(FogasIdeje AS DATE) = @datum
    `);

  return Number(result.recordset[0]?.FogasokSzama || 0);
}

async function getFishingDayRecord(userId, dateKey) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("datum", sql.Date, dateKey)
    .query(`
      SELECT HorgaszNapId, Megjegyzes
      FROM HorgaszNap
      WHERE FelhasznaloId = @userId
        AND Datum = @datum
    `);

  return result.recordset[0] || null;
}

async function getOwnFishingDays(req, res) {
  try {
    const days = await getManualFishingDaysForUserId(req.user.id);
    return res.status(200).json(days);
  } catch (error) {
    console.error("Sajat horgasznapok lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a horgásznapok lekérésekor.",
    });
  }
}

async function getUserProfileFishingDays(req, res) {
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

    const days = await getManualFishingDaysForUserId(userId);
    return res.status(200).json(days);
  } catch (error) {
    console.error("Profil horgasznapok lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a horgásznapok lekérésekor.",
    });
  }
}

async function addFishingDay(req, res) {
  try {
    const dateKey = normalizeDateKey(req.params.dateKey || req.body?.datum);

    if (!dateKey) {
      return res.status(400).json({
        message: "Érvénytelen dátum.",
      });
    }

    const catchesOnDate = await countCatchesOnDate(req.user.id, dateKey);

    if (catchesOnDate > 0) {
      return res.status(400).json({
        message: "Az adott napot a fogás már automatikusan jelöli.",
      });
    }

    const pool = await poolPromise;
    await pool
      .request()
      .input("userId", sql.Int, req.user.id)
      .input("datum", sql.Date, dateKey)
      .query(`
        IF NOT EXISTS (
          SELECT 1
          FROM HorgaszNap
          WHERE FelhasznaloId = @userId
            AND Datum = @datum
        )
        BEGIN
          INSERT INTO HorgaszNap (FelhasznaloId, Datum)
          VALUES (@userId, @datum);
        END
      `);

    return res.status(200).json({
      message: "A horgásznap jelölése elmentve.",
      datum: dateKey,
    });
  } catch (error) {
    console.error("Horgasznap hozzaadasi hiba:", error);
    return res.status(500).json({
      message: "Hiba a horgásznap mentésekor.",
    });
  }
}

async function saveFishingDayNote(req, res) {
  try {
    const dateKey = normalizeDateKey(req.params.dateKey);
    const rawNote = typeof req.body?.megjegyzes === "string" ? req.body.megjegyzes.trim() : "";
    const note = rawNote.slice(0, 500);

    if (!dateKey) {
      return res.status(400).json({
        message: "Érvénytelen dátum.",
      });
    }

    const pool = await poolPromise;
    const catchesOnDate = await countCatchesOnDate(req.user.id, dateKey);
    const existingRecord = await getFishingDayRecord(req.user.id, dateKey);

    if (catchesOnDate <= 0 && !existingRecord) {
      return res.status(400).json({
        message: "Megjegyzést csak megjelölt naphoz lehet hozzáadni.",
      });
    }

    if (!note) {
      if (!existingRecord) {
        return res.status(200).json({
          message: "A megjegyzés törölve.",
          datum: dateKey,
          megjegyzes: "",
        });
      }

      if (catchesOnDate > 0) {
        await pool
          .request()
          .input("userId", sql.Int, req.user.id)
          .input("datum", sql.Date, dateKey)
          .query(`
            UPDATE HorgaszNap
            SET Megjegyzes = NULL
            WHERE FelhasznaloId = @userId
              AND Datum = @datum
          `);
      } else {
        await pool
          .request()
          .input("userId", sql.Int, req.user.id)
          .input("datum", sql.Date, dateKey)
          .query(`
            DELETE FROM HorgaszNap
            WHERE FelhasznaloId = @userId
              AND Datum = @datum
          `);
      }

      return res.status(200).json({
        message: "A megjegyzés törölve.",
        datum: dateKey,
        megjegyzes: "",
      });
    }

    await pool
      .request()
      .input("userId", sql.Int, req.user.id)
      .input("datum", sql.Date, dateKey)
      .input("megjegyzes", sql.NVarChar(500), note)
      .query(`
        IF EXISTS (
          SELECT 1
          FROM HorgaszNap
          WHERE FelhasznaloId = @userId
            AND Datum = @datum
        )
        BEGIN
          UPDATE HorgaszNap
          SET Megjegyzes = @megjegyzes
          WHERE FelhasznaloId = @userId
            AND Datum = @datum;
        END
        ELSE
        BEGIN
          INSERT INTO HorgaszNap (FelhasznaloId, Datum, Megjegyzes)
          VALUES (@userId, @datum, @megjegyzes);
        END
      `);

    return res.status(200).json({
      message: "A megjegyzés sikeresen mentve.",
      datum: dateKey,
      megjegyzes: note,
    });
  } catch (error) {
    console.error("Horgasznap megjegyzes mentesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a megjegyzés mentésekor.",
    });
  }
}

async function deleteFishingDay(req, res) {
  try {
    const dateKey = normalizeDateKey(req.params.dateKey);

    if (!dateKey) {
      return res.status(400).json({
        message: "Érvénytelen dátum.",
      });
    }

    const catchesOnDate = await countCatchesOnDate(req.user.id, dateKey);

    if (catchesOnDate > 0) {
      return res.status(400).json({
        message: "A fogásos nap jelölése csak a fogások törlésével szüntethető meg.",
      });
    }

    const pool = await poolPromise;
    await pool
      .request()
      .input("userId", sql.Int, req.user.id)
      .input("datum", sql.Date, dateKey)
      .query(`
        DELETE FROM HorgaszNap
        WHERE FelhasznaloId = @userId
          AND Datum = @datum
      `);

    return res.status(200).json({
      message: "A horgásznap jelölése törölve.",
      datum: dateKey,
    });
  } catch (error) {
    console.error("Horgasznap torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a horgásznap törlésekor.",
    });
  }
}

module.exports = {
  getOwnFishingDays,
  getUserProfileFishingDays,
  addFishingDay,
  deleteFishingDay,
  saveFishingDayNote,
};
