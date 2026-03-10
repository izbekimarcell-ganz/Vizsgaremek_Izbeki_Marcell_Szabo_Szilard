const { sql, poolPromise } = require("../DbConfig");

// Összes halfaj lekérése
const getHalfajok = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        HalfajId,
        MagyarNev,
        LatinNev,
        Vedett,
        MinMeretCm,
        NapiLimit,
        Megjegyzes
      FROM dbo.Halfaj
      ORDER BY MagyarNev
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Halfajok lekeres hiba:", err);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

// Egy halfaj részletes adatai (vízterületekkel)
const getHalfajReszletek = async (req, res) => {
  try {
    const { halfajId } = req.params;
    const pool = await poolPromise;

    // Halfaj alapadatok
    const halfajResult = await pool
      .request()
      .input("halfajId", sql.Int, parseInt(halfajId))
      .query(`
        SELECT
          HalfajId,
          MagyarNev,
          LatinNev,
          Vedett,
          MinMeretCm,
          NapiLimit,
          Megjegyzes
        FROM dbo.Halfaj
        WHERE HalfajId = @halfajId
      `);

    if (halfajResult.recordset.length === 0) {
      return res.status(404).json({ message: "Halfaj nem talalhato." });
    }

    // Vízterületek ahol előfordul
    const vizteruletekResult = await pool
      .request()
      .input("halfajId", sql.Int, parseInt(halfajId))
      .query(`
        SELECT
          v.VizteruletId,
          v.Nev,
          vt.Nev AS VizTipusNev,
          vh.Megjegyzes
        FROM dbo.VizteruletHalfaj vh
        INNER JOIN dbo.Vizterulet v ON vh.VizteruletId = v.VizteruletId
        INNER JOIN dbo.VizTipus vt ON v.VizTipusId = vt.VizTipusId
        WHERE vh.HalfajId = @halfajId
        ORDER BY v.Nev
      `);

    res.json({
      halfaj: halfajResult.recordset[0],
      vizteruletek: vizteruletekResult.recordset,
    });
  } catch (error) {
    console.error("Halfaj reszletek hiba:", error);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

module.exports = {
  getHalfajok,
  getHalfajReszletek,
};
