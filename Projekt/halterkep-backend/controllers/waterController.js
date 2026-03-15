const { sql, poolPromise } = require("../DbConfig");

function normalizeOptionalNumberList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const ids = values
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => !Number.isNaN(value));

  return [...new Set(ids)];
}

function mapWaterPayload(body = {}) {
  return {
    nev: String(body.nev || "").trim(),
    vizTipusId: Number.parseInt(body.vizTipusId, 10),
    megyeIds: normalizeOptionalNumberList(body.megyeIds),
    halfajIds: normalizeOptionalNumberList(body.halfajIds),
  };
}

async function replaceWaterRelations(transaction, vizteruletId, megyeIds, halfajIds) {
  await new sql.Request(transaction)
    .input("vizteruletId", sql.Int, vizteruletId)
    .query(`
      DELETE FROM VizteruletMegye
      WHERE VizteruletId = @vizteruletId;

      DELETE FROM VizteruletHalfaj
      WHERE VizteruletId = @vizteruletId;
    `);

  for (const megyeId of megyeIds) {
    await new sql.Request(transaction)
      .input("vizteruletId", sql.Int, vizteruletId)
      .input("megyeId", sql.Int, megyeId)
      .query(`
        INSERT INTO VizteruletMegye (VizteruletId, MegyeId)
        VALUES (@vizteruletId, @megyeId)
      `);
  }

  for (const halfajId of halfajIds) {
    await new sql.Request(transaction)
      .input("vizteruletId", sql.Int, vizteruletId)
      .input("halfajId", sql.Int, halfajId)
      .query(`
        INSERT INTO VizteruletHalfaj (VizteruletId, HalfajId)
        VALUES (@vizteruletId, @halfajId)
      `);
  }
}

async function hasDuplicateWater(transaction, { vizteruletId = null, nev, vizTipusId, megyeIds }) {
  const countyCsv = megyeIds.join(",");

  const result = await new sql.Request(transaction)
    .input("vizteruletId", sql.Int, vizteruletId)
    .input("nev", sql.NVarChar(150), nev)
    .input("vizTipusId", sql.Int, vizTipusId)
    .input("megyeIdsCsv", sql.NVarChar(4000), countyCsv)
    .query(`
      SELECT TOP 1 v.VizteruletId
      FROM Vizterulet v
      WHERE v.Nev = @nev
        AND v.VizTipusId = @vizTipusId
        AND (@vizteruletId IS NULL OR v.VizteruletId <> @vizteruletId)
        AND NOT EXISTS (
          SELECT vm.MegyeId
          FROM VizteruletMegye vm
          WHERE vm.VizteruletId = v.VizteruletId
          EXCEPT
          SELECT TRY_CAST(value AS INT)
          FROM STRING_SPLIT(@megyeIdsCsv, ',')
          WHERE value <> ''
        )
        AND NOT EXISTS (
          SELECT TRY_CAST(value AS INT)
          FROM STRING_SPLIT(@megyeIdsCsv, ',')
          WHERE value <> ''
          EXCEPT
          SELECT vm.MegyeId
          FROM VizteruletMegye vm
          WHERE vm.VizteruletId = v.VizteruletId
        )
    `);

  return result.recordset.length > 0;
}

async function getWaters(req, res) {
  try {
    const { halfaj = "", megye = "", viztipus = "" } = req.query;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("halfaj", sql.NVarChar(100), halfaj.trim())
      .input("megye", sql.NVarChar(50), megye.trim())
      .input("viztipus", sql.NVarChar(50), viztipus.trim())
      .query(`
        SELECT
          v.VizteruletId,
          v.Nev,
          v.VizTipusId,
          vt.Nev AS VizTipusNev,
          STRING_AGG(m.Nev, ', ') AS MegyeNev
        FROM Vizterulet v
        INNER JOIN VizTipus vt ON vt.VizTipusId = v.VizTipusId
        LEFT JOIN VizteruletMegye vm ON vm.VizteruletId = v.VizteruletId
        LEFT JOIN Megye m ON m.MegyeId = vm.MegyeId
        WHERE (@viztipus = '' OR vt.Nev = @viztipus)
          AND (@megye = '' OR EXISTS (
            SELECT 1
            FROM VizteruletMegye vm2
            INNER JOIN Megye m2 ON m2.MegyeId = vm2.MegyeId
            WHERE vm2.VizteruletId = v.VizteruletId
              AND m2.Nev = @megye
          ))
          AND (@halfaj = '' OR EXISTS (
            SELECT 1
            FROM VizteruletHalfaj vh2
            INNER JOIN Halfaj h2 ON h2.HalfajId = vh2.HalfajId
            WHERE vh2.VizteruletId = v.VizteruletId
              AND h2.MagyarNev LIKE '%' + @halfaj + '%'
          ))
        GROUP BY v.VizteruletId, v.Nev, v.VizTipusId, vt.Nev
        ORDER BY v.Nev
      `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Vizteruletek lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a vizteruletek lekeresekor.",
    });
  }
}

async function getWaterDetails(req, res) {
  try {
    const vizteruletId = parseInt(req.params.id, 10);

    if (Number.isNaN(vizteruletId)) {
      return res.status(400).json({
        message: "Ervenytelen vizterulet azonosito.",
      });
    }

    const pool = await poolPromise;
    const detailsResult = await pool
      .request()
      .input("vizteruletId", sql.Int, vizteruletId)
      .query(`
        SELECT
          v.VizteruletId,
          v.Nev,
          v.VizTipusId,
          vt.Nev AS VizTipusNev,
          STRING_AGG(m.Nev, ', ') AS Megyek
        FROM Vizterulet v
        INNER JOIN VizTipus vt ON vt.VizTipusId = v.VizTipusId
        LEFT JOIN VizteruletMegye vm ON vm.VizteruletId = v.VizteruletId
        LEFT JOIN Megye m ON m.MegyeId = vm.MegyeId
        WHERE v.VizteruletId = @vizteruletId
        GROUP BY v.VizteruletId, v.Nev, v.VizTipusId, vt.Nev
      `);

    const vizterulet = detailsResult.recordset[0];

    if (!vizterulet) {
      return res.status(404).json({
        message: "Vizterulet nem talalhato.",
      });
    }

    const [halfajokResult, megyekResult] = await Promise.all([
      pool
        .request()
        .input("vizteruletId", sql.Int, vizteruletId)
        .query(`
          SELECT
            h.HalfajId,
            h.MagyarNev,
            h.LatinNev,
            h.Vedett,
            h.MinMeretCm,
            h.NapiLimit,
            vh.Megjegyzes
          FROM VizteruletHalfaj vh
          INNER JOIN Halfaj h ON h.HalfajId = vh.HalfajId
          WHERE vh.VizteruletId = @vizteruletId
          ORDER BY h.MagyarNev
        `),
      pool
        .request()
        .input("vizteruletId", sql.Int, vizteruletId)
        .query(`
          SELECT m.MegyeId, m.Nev
          FROM VizteruletMegye vm
          INNER JOIN Megye m ON m.MegyeId = vm.MegyeId
          WHERE vm.VizteruletId = @vizteruletId
          ORDER BY m.Nev
        `),
    ]);

    return res.status(200).json({
      vizterulet: {
        ...vizterulet,
        Leiras: `${vizterulet.Nev} egy ${vizterulet.VizTipusNev.toLowerCase()} tipusú vizterulet.`,
      },
      halfajok: halfajokResult.recordset,
      megyek: megyekResult.recordset,
    });
  } catch (error) {
    console.error("Vizterulet reszletek hiba:", error);
    return res.status(500).json({
      message: "Hiba a vizterulet reszleteinek lekeresekor.",
    });
  }
}

async function createWater(req, res) {
  let transaction;

  try {
    const payload = mapWaterPayload(req.body);

    if (!payload.nev || Number.isNaN(payload.vizTipusId) || payload.megyeIds.length !== 1) {
      return res.status(400).json({
        message: "A nev, a viztipus es pontosan egy megye megadasa kotelezo.",
      });
    }

    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const duplicateExists = await hasDuplicateWater(transaction, payload);

    if (duplicateExists) {
      await transaction.rollback();
      return res.status(409).json({
        message: "Van mar ilyen vizterulet.",
      });
    }

    const result = await new sql.Request(transaction)
      .input("nev", sql.NVarChar(150), payload.nev)
      .input("vizTipusId", sql.Int, payload.vizTipusId)
      .query(`
        INSERT INTO Vizterulet (Nev, VizTipusId)
        OUTPUT INSERTED.VizteruletId, INSERTED.Nev, INSERTED.VizTipusId
        VALUES (@nev, @vizTipusId)
      `);

    const water = result.recordset[0];
    await replaceWaterRelations(
      transaction,
      water.VizteruletId,
      payload.megyeIds,
      payload.halfajIds
    );
    await transaction.commit();

    return res.status(201).json({
      message: "Vizterulet sikeresen letrehozva.",
      water,
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Vizterulet letrehozas rollback hiba:", rollbackError);
      }
    }

    console.error("Vizterulet letrehozasi hiba:", error);
    return res.status(500).json({
      message: "Hiba a vizterulet letrehozasakor.",
    });
  }
}

async function updateWater(req, res) {
  let transaction;

  try {
    const vizteruletId = Number.parseInt(req.params.id, 10);
    const payload = mapWaterPayload(req.body);

    if (Number.isNaN(vizteruletId)) {
      return res.status(400).json({
        message: "Ervenytelen vizterulet azonosito.",
      });
    }

    if (!payload.nev || Number.isNaN(payload.vizTipusId) || payload.megyeIds.length !== 1) {
      return res.status(400).json({
        message: "A nev, a viztipus es pontosan egy megye megadasa kotelezo.",
      });
    }

    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const duplicateExists = await hasDuplicateWater(transaction, {
      ...payload,
      vizteruletId,
    });

    if (duplicateExists) {
      await transaction.rollback();
      return res.status(409).json({
        message: "Van mar ilyen vizterulet.",
      });
    }

    const result = await new sql.Request(transaction)
      .input("vizteruletId", sql.Int, vizteruletId)
      .input("nev", sql.NVarChar(150), payload.nev)
      .input("vizTipusId", sql.Int, payload.vizTipusId)
      .query(`
        UPDATE Vizterulet
        SET
          Nev = @nev,
          VizTipusId = @vizTipusId
        OUTPUT INSERTED.VizteruletId, INSERTED.Nev, INSERTED.VizTipusId
        WHERE VizteruletId = @vizteruletId
      `);

    if (!result.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Vizterulet nem talalhato.",
      });
    }

    await replaceWaterRelations(
      transaction,
      vizteruletId,
      payload.megyeIds,
      payload.halfajIds
    );
    await transaction.commit();

    return res.status(200).json({
      message: "Vizterulet sikeresen modositva.",
      water: result.recordset[0],
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Vizterulet modositas rollback hiba:", rollbackError);
      }
    }

    console.error("Vizterulet modositasi hiba:", error);
    return res.status(500).json({
      message: "Hiba a vizterulet modositasakor.",
    });
  }
}

async function deleteWater(req, res) {
  try {
    const vizteruletId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(vizteruletId)) {
      return res.status(400).json({
        message: "Ervenytelen vizterulet azonosito.",
      });
    }

    const pool = await poolPromise;
    const usageResult = await pool
      .request()
      .input("vizteruletId", sql.Int, vizteruletId)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM VizteruletMegye WHERE VizteruletId = @vizteruletId) AS MegyeKapcsolatok,
          (SELECT COUNT(*) FROM VizteruletHalfaj WHERE VizteruletId = @vizteruletId) AS HalfajKapcsolatok,
          (SELECT COUNT(*) FROM FogasNaplo WHERE VizteruletId = @vizteruletId) AS FogasokSzama
      `);

    const usage = usageResult.recordset[0];

    if (
      usage.MegyeKapcsolatok > 0 ||
      usage.HalfajKapcsolatok > 0 ||
      usage.FogasokSzama > 0
    ) {
      return res.status(409).json({
        message: "A vizterulet nem torolheto, mert kapcsolodik mas adatokhoz.",
      });
    }

    const result = await pool
      .request()
      .input("vizteruletId", sql.Int, vizteruletId)
      .query(`
        DELETE FROM Vizterulet
        OUTPUT DELETED.VizteruletId
        WHERE VizteruletId = @vizteruletId
      `);

    if (!result.recordset.length) {
      return res.status(404).json({
        message: "Vizterulet nem talalhato.",
      });
    }

    return res.status(200).json({
      message: "Vizterulet sikeresen torolve.",
    });
  } catch (error) {
    console.error("Vizterulet torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a vizterulet torlesekor.",
    });
  }
}

async function getWaterRelations(req, res) {
  try {
    const vizteruletId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(vizteruletId)) {
      return res.status(400).json({
        message: "Ervenytelen vizterulet azonosito.",
      });
    }

    const pool = await poolPromise;
    const [waterResult, countiesResult, speciesResult] = await Promise.all([
      pool
        .request()
        .input("vizteruletId", sql.Int, vizteruletId)
        .query(`
          SELECT VizteruletId, Nev, VizTipusId
          FROM Vizterulet
          WHERE VizteruletId = @vizteruletId
        `),
      pool
        .request()
        .input("vizteruletId", sql.Int, vizteruletId)
        .query(`
          SELECT m.MegyeId, m.Nev
          FROM VizteruletMegye vm
          INNER JOIN Megye m ON m.MegyeId = vm.MegyeId
          WHERE vm.VizteruletId = @vizteruletId
          ORDER BY m.Nev
        `),
      pool
        .request()
        .input("vizteruletId", sql.Int, vizteruletId)
        .query(`
          SELECT h.HalfajId, h.MagyarNev
          FROM VizteruletHalfaj vh
          INNER JOIN Halfaj h ON h.HalfajId = vh.HalfajId
          WHERE vh.VizteruletId = @vizteruletId
          ORDER BY h.MagyarNev
        `),
    ]);

    const water = waterResult.recordset[0];

    if (!water) {
      return res.status(404).json({
        message: "Vizterulet nem talalhato.",
      });
    }

    return res.status(200).json({
      water,
      megyek: countiesResult.recordset,
      halfajok: speciesResult.recordset,
    });
  } catch (error) {
    console.error("Vizterulet kapcsolatok lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a kapcsolatok lekeresekor.",
    });
  }
}

async function updateWaterRelations(req, res) {
  let transaction;

  try {
    const vizteruletId = Number.parseInt(req.params.id, 10);
    const megyeIds = normalizeOptionalNumberList(req.body.megyeIds);
    const halfajIds = normalizeOptionalNumberList(req.body.halfajIds);

    if (Number.isNaN(vizteruletId)) {
      return res.status(400).json({
        message: "Ervenytelen vizterulet azonosito.",
      });
    }

    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const waterExists = await new sql.Request(transaction)
      .input("vizteruletId", sql.Int, vizteruletId)
      .query(`
        SELECT VizteruletId
        FROM Vizterulet
        WHERE VizteruletId = @vizteruletId
      `);

    if (!waterExists.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Vizterulet nem talalhato.",
      });
    }

    await replaceWaterRelations(transaction, vizteruletId, megyeIds, halfajIds);

    await transaction.commit();

    return res.status(200).json({
      message: "Kapcsolatok sikeresen mentve.",
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Kapcsolatok rollback hiba:", rollbackError);
      }
    }

    console.error("Kapcsolatok mentesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a kapcsolatok mentese soran.",
    });
  }
}

async function getCounties(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT MegyeId, Nev
      FROM Megye
      ORDER BY Nev
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Megyek lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a megyek lekeresekor.",
    });
  }
}

async function getWaterTypes(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT VizTipusId, Nev
      FROM VizTipus
      ORDER BY Nev
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Viztipusok lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a viztipusok lekeresekor.",
    });
  }
}

module.exports = {
  getWaters,
  getWaterDetails,
  getCounties,
  getWaterTypes,
  createWater,
  updateWater,
  deleteWater,
  getWaterRelations,
  updateWaterRelations,
};
