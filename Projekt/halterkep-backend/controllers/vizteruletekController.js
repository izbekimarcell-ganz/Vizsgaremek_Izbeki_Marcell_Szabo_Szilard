const { sql, poolPromise } = require("../DbConfig");

// Vízterületek lekérése szűrési lehetőségekkel
const getVizteruletek = async (req, res) => {
  try {
    const { halfaj, megye, viztipus } = req.query;
    const pool = await poolPromise;

    let query = `
      SELECT DISTINCT
        v.VizteruletId,
        v.Nev,
        v.VizTipusId,
        vt.Nev AS VizTipusNev
      FROM dbo.Vizterulet v
      INNER JOIN dbo.VizTipus vt ON v.VizTipusId = vt.VizTipusId
    `;

    let whereConditions = [];
    const request = pool.request();

    // Halfaj szűrés
    if (halfaj) {
      query += `
        INNER JOIN dbo.VizteruletHalfaj vh ON v.VizteruletId = vh.VizteruletId
        INNER JOIN dbo.Halfaj h ON vh.HalfajId = h.HalfajId
      `;
      whereConditions.push(`h.MagyarNev LIKE @halfaj`);
      request.input("halfaj", sql.NVarChar(100), `%${halfaj}%`);
    }

    // Megye szűrés
    if (megye) {
      query += `
        INNER JOIN dbo.VizteruletMegye vm ON v.VizteruletId = vm.VizteruletId
        INNER JOIN dbo.Megye m ON vm.MegyeId = m.MegyeId
      `;
      whereConditions.push(`m.Nev LIKE @megye`);
      request.input("megye", sql.NVarChar(50), `%${megye}%`);
    }

    // Víztípus szűrés
    if (viztipus) {
      whereConditions.push(`vt.Nev LIKE @viztipus`);
      request.input("viztipus", sql.NVarChar(50), `%${viztipus}%`);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ` + whereConditions.join(" AND ");
    }

    query += ` ORDER BY v.Nev`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Vizteruletek lekeres hiba:", err);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

// Vízterület részletes adatai (halfajokkal, megyékkel)
const getVizteruletReszletek = async (req, res) => {
  try {
    const { vizteruletId } = req.params;
    const pool = await poolPromise;

    // Alapadatok
    const vizteruletResult = await pool
      .request()
      .input("vizteruletId", sql.Int, parseInt(vizteruletId))
      .query(`
        SELECT
          v.VizteruletId,
          v.Nev,
          v.VizTipusId,
          vt.Nev AS VizTipusNev
        FROM dbo.Vizterulet v
        INNER JOIN dbo.VizTipus vt ON v.VizTipusId = vt.VizTipusId
        WHERE v.VizteruletId = @vizteruletId
      `);

    if (vizteruletResult.recordset.length === 0) {
      return res.status(404).json({ message: "Vizterulet nem talalhato." });
    }

    // Halfajok
    const halfajokResult = await pool
      .request()
      .input("vizteruletId", sql.Int, parseInt(vizteruletId))
      .query(`
        SELECT
          h.HalfajId,
          h.MagyarNev,
          h.LatinNev,
          h.Vedett,
          vh.Megjegyzes
        FROM dbo.VizteruletHalfaj vh
        INNER JOIN dbo.Halfaj h ON vh.HalfajId = h.HalfajId
        WHERE vh.VizteruletId = @vizteruletId
        ORDER BY h.MagyarNev
      `);

    // Megyék
    const megyekResult = await pool
      .request()
      .input("vizteruletId", sql.Int, parseInt(vizteruletId))
      .query(`
        SELECT
          m.MegyeId,
          m.Nev
        FROM dbo.VizteruletMegye vm
        INNER JOIN dbo.Megye m ON vm.MegyeId = m.MegyeId
        WHERE vm.VizteruletId = @vizteruletId
        ORDER BY m.Nev
      `);

    res.json({
      vizterulet: vizteruletResult.recordset[0],
      halfajok: halfajokResult.recordset,
      megyek: megyekResult.recordset,
    });
  } catch (error) {
    console.error("Vizterulet reszletek hiba:", error);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

module.exports = {
  getVizteruletek,
  getVizteruletReszletek,
};