const { sql, poolPromise } = require("../DbConfig");

// Összes fogás lekérése szűrési lehetőségekkel
const getFogasok = async (req, res) => {
  try {
    const { halfaj, vizterulet, felhasznalo } = req.query;
    const pool = await poolPromise;

    let query = `
      SELECT
        fn.FogasId,
        fn.FelhasznaloId,
        f.Felhasznalonev,
        fn.HalfajId,
        h.MagyarNev AS HalfajNev,
        fn.VizteruletId,
        v.Nev AS VizteruletNev,
        fn.FogasIdeje,
        fn.SulyKg,
        fn.HosszCm,
        fn.FotoUrl,
        fn.Megjegyzes
      FROM dbo.FogasNaplo fn
      INNER JOIN dbo.Felhasznalo f ON fn.FelhasznaloId = f.FelhasznaloId
      INNER JOIN dbo.Halfaj h ON fn.HalfajId = h.HalfajId
      INNER JOIN dbo.Vizterulet v ON fn.VizteruletId = v.VizteruletId
      WHERE 1=1
    `;

    const request = pool.request();

    if (halfaj) {
      query += ` AND fn.HalfajId = @halfajId`;
      request.input("halfajId", sql.Int, parseInt(halfaj));
    }

    if (vizterulet) {
      query += ` AND fn.VizteruletId = @vizteruletId`;
      request.input("vizteruletId", sql.Int, parseInt(vizterulet));
    }

    if (felhasznalo) {
      query += ` AND fn.FelhasznaloId = @felhasznaloId`;
      request.input("felhasznaloId", sql.Int, parseInt(felhasznalo));
    }

    query += ` ORDER BY fn.FogasIdeje DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Fogasnaplo lekeres hiba:", err);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

// Új fogás rögzítése
const addFogas = async (req, res) => {
  try {
    const { halfajId, vizteruletId, fogasIdeje, sulyKg, hosszCm, fotoUrl, megjegyzes } = req.body;
    const felhasznaloId = req.user.id; // JWT tokenből

    if (!halfajId || !vizteruletId || !fogasIdeje) {
      return res.status(400).json({
        message: "Kotelezo mezok: halfajId, vizteruletId, fogasIdeje.",
      });
    }

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("felhasznaloId", sql.Int, felhasznaloId)
      .input("halfajId", sql.Int, halfajId)
      .input("vizteruletId", sql.Int, vizteruletId)
      .input("fogasIdeje", sql.DateTime2, new Date(fogasIdeje))
      .input("sulyKg", sql.Decimal(5, 2), sulyKg || null)
      .input("hosszCm", sql.Int, hosszCm || null)
      .input("fotoUrl", sql.NVarChar(300), fotoUrl || null)
      .input("megjegyzes", sql.NVarChar(500), megjegyzes || null)
      .query(`
        INSERT INTO dbo.FogasNaplo 
          (FelhasznaloId, HalfajId, VizteruletId, FogasIdeje, SulyKg, HosszCm, FotoUrl, Megjegyzes)
        OUTPUT
          INSERTED.FogasId,
          INSERTED.FelhasznaloId,
          INSERTED.HalfajId,
          INSERTED.VizteruletId,
          INSERTED.FogasIdeje,
          INSERTED.SulyKg,
          INSERTED.HosszCm,
          INSERTED.FotoUrl,
          INSERTED.Megjegyzes
        VALUES 
          (@felhasznaloId, @halfajId, @vizteruletId, @fogasIdeje, @sulyKg, @hosszCm, @fotoUrl, @megjegyzes)
      `);

    return res.status(201).json({
      message: "Fogas sikeresen rogzitve.",
      fogas: result.recordset[0],
    });
  } catch (error) {
    console.error("Fogas hozzaadas hiba:", error);
    return res.status(500).json({
      message: "Szerverhiba tortent.",
    });
  }
};

// Egy felhasználó saját fogásai
const getSajatFogasok = async (req, res) => {
  try {
    const felhasznaloId = req.user.id;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("felhasznaloId", sql.Int, felhasznaloId)
      .query(`
        SELECT
          fn.FogasId,
          fn.HalfajId,
          h.MagyarNev AS HalfajNev,
          fn.VizteruletId,
          v.Nev AS VizteruletNev,
          fn.FogasIdeje,
          fn.SulyKg,
          fn.HosszCm,
          fn.FotoUrl,
          fn.Megjegyzes
        FROM dbo.FogasNaplo fn
        INNER JOIN dbo.Halfaj h ON fn.HalfajId = h.HalfajId
        INNER JOIN dbo.Vizterulet v ON fn.VizteruletId = v.VizteruletId
        WHERE fn.FelhasznaloId = @felhasznaloId
        ORDER BY fn.FogasIdeje DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Sajat fogasok lekeres hiba:", error);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

module.exports = {
  getFogasok,
  addFogas,
  getSajatFogasok,
};