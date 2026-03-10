const { sql, poolPromise } = require("../DbConfig");

const getTemak = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        TemaId,
        Cim,
        Letrehozva
      FROM ForumTema
      ORDER BY Letrehozva DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Forum tema hiba:", err);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

module.exports = {
  getTemak
};