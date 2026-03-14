const { sql, poolPromise } = require("../DbConfig");

async function getOwnCatches(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.id)
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

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Sajat fogasok lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a fogasok lekeresekor.",
    });
  }
}

async function createCatch(req, res) {
  try {
    const { halfajId, vizteruletId, fogasIdeje, sulyKg, hosszCm, fotoUrl, megjegyzes } = req.body;

    if (!halfajId || !vizteruletId || !fogasIdeje) {
      return res.status(400).json({
        message: "A halfaj, a vizterulet es a fogas ideje kotelezo.",
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
      .input("fotoUrl", sql.NVarChar(300), fotoUrl || null)
      .input("megjegyzes", sql.NVarChar(500), megjegyzes || null)
      .query(`
        INSERT INTO FogasNaplo
          (FelhasznaloId, HalfajId, VizteruletId, FogasIdeje, SulyKg, HosszCm, FotoUrl, Megjegyzes)
        OUTPUT INSERTED.FogasId
        VALUES
          (@felhasznaloId, @halfajId, @vizteruletId, @fogasIdeje, @sulyKg, @hosszCm, @fotoUrl, @megjegyzes)
      `);

    return res.status(201).json({
      message: "Fogas sikeresen rogzitve.",
      fogasId: result.recordset[0].FogasId,
    });
  } catch (error) {
    console.error("Fogas rogzitese hiba:", error);
    return res.status(500).json({
      message: "Hiba a fogas rogzitese kozben.",
    });
  }
}

module.exports = {
  getOwnCatches,
  createCatch,
};
