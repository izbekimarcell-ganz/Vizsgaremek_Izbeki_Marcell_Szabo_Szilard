const { sql, poolPromise } = require("../DbConfig");

const getVizteruletek = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        VizteruletId,
        Nev,
        VizTipusId
      FROM Vizterulet
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Vizteruletek hiba:", err);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

module.exports = {
  getVizteruletek
};