const { poolPromise } = require("../DbConfig");

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
      message: "Hiba a halfajok lekeresekor.",
    });
  }
}

module.exports = {
  getSpecies,
};
