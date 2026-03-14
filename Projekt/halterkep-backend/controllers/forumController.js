const { sql, poolPromise } = require("../DbConfig");

async function getTopics(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        t.TemaId,
        t.Cim,
        t.Letrehozva,
        f.Felhasznalonev,
        COUNT(h.HozzaszolasId) AS HozzaszolasokSzama
      FROM ForumTema t
      INNER JOIN Felhasznalo f ON f.FelhasznaloId = t.FelhasznaloId
      LEFT JOIN ForumHozzaszolas h ON h.TemaId = t.TemaId
      GROUP BY t.TemaId, t.Cim, t.Letrehozva, f.Felhasznalonev
      ORDER BY t.Letrehozva DESC, t.TemaId DESC
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Forum temak lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a forum temak lekeresekor.",
    });
  }
}

async function createTopic(req, res) {
  const { cim, szoveg, kepUrl } = req.body;

  if (!cim) {
    return res.status(400).json({
      message: "A tema cime kotelezo.",
    });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const topicResult = await new sql.Request(transaction)
        .input("felhasznaloId", sql.Int, req.user.id)
        .input("cim", sql.NVarChar(150), cim.trim())
        .query(`
          INSERT INTO ForumTema (FelhasznaloId, Cim)
          OUTPUT INSERTED.TemaId
          VALUES (@felhasznaloId, @cim)
        `);

      const temaId = topicResult.recordset[0].TemaId;

      if (szoveg && szoveg.trim()) {
        await new sql.Request(transaction)
          .input("temaId", sql.Int, temaId)
          .input("felhasznaloId", sql.Int, req.user.id)
          .input("szoveg", sql.NVarChar(sql.MAX), szoveg.trim())
          .input("kepUrl", sql.NVarChar(300), kepUrl || null)
          .query(`
            INSERT INTO ForumHozzaszolas (TemaId, FelhasznaloId, Szoveg, KepUrl)
            VALUES (@temaId, @felhasznaloId, @szoveg, @kepUrl)
          `);
      }

      await transaction.commit();

      return res.status(201).json({
        message: "Tema sikeresen letrehozva.",
        temaId,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Tema letrehozasi hiba:", error);
    return res.status(500).json({
      message: "Hiba a tema letrehozasa kozben.",
    });
  }
}

async function getTopicReplies(req, res) {
  try {
    const temaId = parseInt(req.params.temaId, 10);

    if (Number.isNaN(temaId)) {
      return res.status(400).json({
        message: "Ervenytelen tema azonosito.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("temaId", sql.Int, temaId)
      .query(`
        SELECT
          h.HozzaszolasId,
          h.TemaId,
          h.Szoveg,
          h.KepUrl,
          h.Letrehozva,
          f.Felhasznalonev
        FROM ForumHozzaszolas h
        INNER JOIN Felhasznalo f ON f.FelhasznaloId = h.FelhasznaloId
        WHERE h.TemaId = @temaId
        ORDER BY h.Letrehozva ASC, h.HozzaszolasId ASC
      `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Hozzaszolasok lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a hozzaszolasok lekeresekor.",
    });
  }
}

async function createReply(req, res) {
  try {
    const { temaId, szoveg, kepUrl } = req.body;

    if (!temaId || !szoveg?.trim()) {
      return res.status(400).json({
        message: "A tema es a szoveg kotelezo.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("temaId", sql.Int, parseInt(temaId, 10))
      .input("felhasznaloId", sql.Int, req.user.id)
      .input("szoveg", sql.NVarChar(sql.MAX), szoveg.trim())
      .input("kepUrl", sql.NVarChar(300), kepUrl || null)
      .query(`
        INSERT INTO ForumHozzaszolas (TemaId, FelhasznaloId, Szoveg, KepUrl)
        OUTPUT INSERTED.HozzaszolasId
        VALUES (@temaId, @felhasznaloId, @szoveg, @kepUrl)
      `);

    return res.status(201).json({
      message: "Hozzaszolas sikeresen letrehozva.",
      hozzaszolasId: result.recordset[0].HozzaszolasId,
    });
  } catch (error) {
    console.error("Hozzaszolas letrehozasi hiba:", error);
    return res.status(500).json({
      message: "Hiba a hozzaszolas letrehozasa kozben.",
    });
  }
}

module.exports = {
  getTopics,
  createTopic,
  getTopicReplies,
  createReply,
};
