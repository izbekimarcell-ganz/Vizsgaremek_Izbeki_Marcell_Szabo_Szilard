const { sql, poolPromise } = require("../DbConfig");

const getFogasok = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        FogasId,
        FelhasznaloId,
        HalfajId,
        VizteruletId,
        FogasIdeje,
        SulyKg,
        HosszCm
      FROM FogasNaplo
      ORDER BY FogasIdeje DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Fogasnaplo hiba:", err);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

module.exports = {
  getFogasok
};