const { sql, poolPromise } = require("../DbConfig");

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
        GROUP BY v.VizteruletId, v.Nev, vt.Nev
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
          vt.Nev AS VizTipusNev,
          STRING_AGG(m.Nev, ', ') AS Megyek
        FROM Vizterulet v
        INNER JOIN VizTipus vt ON vt.VizTipusId = v.VizTipusId
        LEFT JOIN VizteruletMegye vm ON vm.VizteruletId = v.VizteruletId
        LEFT JOIN Megye m ON m.MegyeId = vm.MegyeId
        WHERE v.VizteruletId = @vizteruletId
        GROUP BY v.VizteruletId, v.Nev, vt.Nev
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
};
