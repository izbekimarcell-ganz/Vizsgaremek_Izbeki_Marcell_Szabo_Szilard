const { sql, poolPromise } = require("../DbConfig");

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? NaN : parsed;
}

function mapSpeciesPayload(body = {}) {
  return {
    magyarNev: String(body.magyarNev || "").trim(),
    latinNev: String(body.latinNev || "").trim() || null,
    vedett: Boolean(body.vedett),
    minMeretCm: normalizeOptionalNumber(body.minMeretCm),
    napiLimit: normalizeOptionalNumber(body.napiLimit),
    megjegyzes: String(body.megjegyzes || "").trim() || null,
  };
}

async function getSpecies(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT HalfajId, MagyarNev, LatinNev, Vedett, MinMeretCm, NapiLimit, Megjegyzes
      FROM Halfaj
      ORDER BY MagyarNev
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Halfajok lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a halfajok lekérésekor.",
    });
  }
}

async function createSpecies(req, res) {
  try {
    const payload = mapSpeciesPayload(req.body);

    if (!payload.magyarNev) {
      return res.status(400).json({
        message: "A magyar név megadása kötelező.",
      });
    }

    if (Number.isNaN(payload.minMeretCm) || Number.isNaN(payload.napiLimit)) {
      return res.status(400).json({
        message: "A méret és a napi limit csak szám lehet.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("magyarNev", sql.NVarChar(100), payload.magyarNev)
      .input("latinNev", sql.NVarChar(150), payload.latinNev)
      .input("vedett", sql.Bit, payload.vedett)
      .input("minMeretCm", sql.Int, payload.minMeretCm)
      .input("napiLimit", sql.Int, payload.napiLimit)
      .input("megjegyzes", sql.NVarChar(500), payload.megjegyzes)
      .query(`
        INSERT INTO Halfaj (MagyarNev, LatinNev, Vedett, MinMeretCm, NapiLimit, Megjegyzes)
        OUTPUT
          INSERTED.HalfajId,
          INSERTED.MagyarNev,
          INSERTED.LatinNev,
          INSERTED.Vedett,
          INSERTED.MinMeretCm,
          INSERTED.NapiLimit,
          INSERTED.Megjegyzes
        VALUES (@magyarNev, @latinNev, @vedett, @minMeretCm, @napiLimit, @megjegyzes)
      `);

    return res.status(201).json({
      message: "Halfaj sikeresen létrehozva.",
      species: result.recordset[0],
    });
  } catch (error) {
    console.error("Halfaj letrehozasi hiba:", error);
    return res.status(500).json({
      message: "Hiba a halfaj létrehozásakor.",
    });
  }
}

async function updateSpecies(req, res) {
  try {
    const halfajId = Number.parseInt(req.params.id, 10);
    const payload = mapSpeciesPayload(req.body);

    if (Number.isNaN(halfajId)) {
      return res.status(400).json({
        message: "Érvénytelen halfaj azonosító.",
      });
    }

    if (!payload.magyarNev) {
      return res.status(400).json({
        message: "A magyar név megadása kötelező.",
      });
    }

    if (Number.isNaN(payload.minMeretCm) || Number.isNaN(payload.napiLimit)) {
      return res.status(400).json({
        message: "A méret és a napi limit csak szám lehet.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("halfajId", sql.Int, halfajId)
      .input("magyarNev", sql.NVarChar(100), payload.magyarNev)
      .input("latinNev", sql.NVarChar(150), payload.latinNev)
      .input("vedett", sql.Bit, payload.vedett)
      .input("minMeretCm", sql.Int, payload.minMeretCm)
      .input("napiLimit", sql.Int, payload.napiLimit)
      .input("megjegyzes", sql.NVarChar(500), payload.megjegyzes)
      .query(`
        UPDATE Halfaj
        SET
          MagyarNev = @magyarNev,
          LatinNev = @latinNev,
          Vedett = @vedett,
          MinMeretCm = @minMeretCm,
          NapiLimit = @napiLimit,
          Megjegyzes = @megjegyzes
        OUTPUT
          INSERTED.HalfajId,
          INSERTED.MagyarNev,
          INSERTED.LatinNev,
          INSERTED.Vedett,
          INSERTED.MinMeretCm,
          INSERTED.NapiLimit,
          INSERTED.Megjegyzes
        WHERE HalfajId = @halfajId
      `);

    if (!result.recordset.length) {
      return res.status(404).json({
        message: "Halfaj nem található.",
      });
    }

    return res.status(200).json({
      message: "Halfaj sikeresen módosítva.",
      species: result.recordset[0],
    });
  } catch (error) {
    console.error("Halfaj modositasi hiba:", error);
    return res.status(500).json({
      message: "Hiba a halfaj módosításakor.",
    });
  }
}

async function deleteSpecies(req, res) {
  try {
    const halfajId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(halfajId)) {
      return res.status(400).json({
        message: "Érvénytelen halfaj azonosító.",
      });
    }

    const pool = await poolPromise;
    const usageResult = await pool
      .request()
      .input("halfajId", sql.Int, halfajId)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM VizteruletHalfaj WHERE HalfajId = @halfajId) AS KapcsolatokSzama,
          (SELECT COUNT(*) FROM FogasNaplo WHERE HalfajId = @halfajId) AS FogasokSzama
      `);

    const usage = usageResult.recordset[0];

    if (usage.FogasokSzama > 0) {
      return res.status(409).json({
        message: "A halfaj nem törölhető, mert már kapcsolódik fogásnapló bejegyzéshez.",
      });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    let result;

    try {
      await new sql.Request(transaction)
        .input("halfajId", sql.Int, halfajId)
        .query(`
          DELETE FROM VizteruletHalfaj
          WHERE HalfajId = @halfajId;
        `);

      result = await new sql.Request(transaction)
        .input("halfajId", sql.Int, halfajId)
        .query(`
          DELETE FROM Halfaj
          OUTPUT DELETED.HalfajId
          WHERE HalfajId = @halfajId
        `);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    if (!result.recordset.length) {
      return res.status(404).json({
        message: "Halfaj nem található.",
      });
    }

    return res.status(200).json({
      message: "Halfaj sikeresen törölve.",
    });
  } catch (error) {
    console.error("Halfaj torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a halfaj törlésekor.",
    });
  }
}

module.exports = {
  getSpecies,
  createSpecies,
  updateSpecies,
  deleteSpecies,
};


