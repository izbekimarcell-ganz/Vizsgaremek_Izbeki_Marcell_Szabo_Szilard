const { createUserNotification } = require("./notificationController");
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
      message: "Hiba a fórum témák lekérésekor.",
    });
  }
}

async function createTopic(req, res) {
  const { cim, szoveg, kepUrl } = req.body;
  const normalizedTitle = String(cim || "").trim();
  const normalizedText = String(szoveg || "").trim();
  const normalizedImageUrl = String(kepUrl || "").trim() || null;

  if (!normalizedTitle) {
    return res.status(400).json({
      message: "A téma címe kötelező.",
    });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const topicResult = await new sql.Request(transaction)
        .input("felhasznaloId", sql.Int, req.user.id)
        .input("cim", sql.NVarChar(150), normalizedTitle)
        .query(`
          INSERT INTO ForumTema (FelhasznaloId, Cim)
          OUTPUT INSERTED.TemaId
          VALUES (@felhasznaloId, @cim)
        `);

      const temaId = topicResult.recordset[0].TemaId;

      if (normalizedText || normalizedImageUrl) {
        await new sql.Request(transaction)
          .input("temaId", sql.Int, temaId)
          .input("felhasznaloId", sql.Int, req.user.id)
          .input("szoveg", sql.NVarChar(sql.MAX), normalizedText)
          .input("kepUrl", sql.NVarChar(sql.MAX), normalizedImageUrl)
          .query(`
            INSERT INTO ForumHozzaszolas (TemaId, FelhasznaloId, Szoveg, KepUrl)
            VALUES (@temaId, @felhasznaloId, @szoveg, @kepUrl)
          `);
      }

      await transaction.commit();

      return res.status(201).json({
        message: "Téma sikeresen létrehozva.",
        temaId,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Tema letrehozasi hiba:", error);
    return res.status(500).json({
      message: "Hiba a téma létrehozása közben.",
    });
  }
}

async function getTopicReplies(req, res) {
  try {
    const temaId = parseInt(req.params.temaId, 10);

    if (Number.isNaN(temaId)) {
      return res.status(400).json({
        message: "Érvénytelen téma azonosító.",
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
      message: "Hiba a hozzászólások lekérésekor.",
    });
  }
}

async function createReply(req, res) {
  try {
    const { temaId, szoveg, kepUrl } = req.body;
    const normalizedText = String(szoveg || "").trim();
    const normalizedImageUrl = String(kepUrl || "").trim() || null;

    if (!temaId || (!normalizedText && !normalizedImageUrl)) {
      return res.status(400).json({
        message: "A téma és legalább szöveg vagy kép kötelező.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("temaId", sql.Int, parseInt(temaId, 10))
      .input("felhasznaloId", sql.Int, req.user.id)
      .input("szoveg", sql.NVarChar(sql.MAX), normalizedText)
      .input("kepUrl", sql.NVarChar(sql.MAX), normalizedImageUrl)
      .query(`
        INSERT INTO ForumHozzaszolas (TemaId, FelhasznaloId, Szoveg, KepUrl)
        OUTPUT INSERTED.HozzaszolasId
        VALUES (@temaId, @felhasznaloId, @szoveg, @kepUrl)
      `);

    return res.status(201).json({
      message: "Hozzászólás sikeresen létrehozva.",
      hozzaszolasId: result.recordset[0].HozzaszolasId,
    });
  } catch (error) {
    console.error("Hozzaszolas letrehozasi hiba:", error);
    return res.status(500).json({
      message: "Hiba a hozzászólás létrehozása közben.",
    });
  }
}

async function getTopicsForAdmin(req, res) {
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
    console.error("Admin forum temak lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a fórum témák admin lekérésekor.",
    });
  }
}

async function getRepliesForAdmin(req, res) {
  try {
    const temaId = parseInt(req.params.temaId, 10);

    if (Number.isNaN(temaId)) {
      return res.status(400).json({
        message: "Érvénytelen téma azonosító.",
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
    console.error("Admin hozzaszolasok lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a hozzászólások admin lekérésekor.",
    });
  }
}

async function deleteTopic(req, res) {
  try {
    const temaId = parseInt(req.params.temaId, 10);

    if (Number.isNaN(temaId)) {
      return res.status(400).json({
        message: "Érvénytelen téma azonosító.",
      });
    }

    const pool = await poolPromise;
    const topicLookup = await pool
      .request()
      .input("temaId", sql.Int, temaId)
      .query(`
        SELECT
          TemaId,
          FelhasznaloId,
          Cim
        FROM ForumTema
        WHERE TemaId = @temaId
      `);

    const topic = topicLookup.recordset[0];

    if (!topic) {
      return res.status(404).json({
        message: "Téma nem található.",
      });
    }

    const result = await pool
      .request()
      .input("temaId", sql.Int, temaId)
      .query(`
        DELETE FROM ForumTema
        OUTPUT DELETED.TemaId
        WHERE TemaId = @temaId
      `);

    await createUserNotification({
      recipientUserId: Number(topic.FelhasznaloId),
      adminUserId: Number(req.user?.id),
      type: "forum-topic-deleted",
      title: "Fórum téma törölve",
      body: `Az admin törölte a "${String(topic.Cim || "").trim() || "Névtelen téma"}" című fórum témádat.`,
    });

    return res.status(200).json({
      message: "Téma sikeresen törölve.",
    });
  } catch (error) {
    console.error("Tema torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a téma törlésekor.",
    });
  }
}

async function deleteReply(req, res) {
  try {
    const hozzaszolasId = parseInt(req.params.hozzaszolasId, 10);

    if (Number.isNaN(hozzaszolasId)) {
      return res.status(400).json({
        message: "Érvénytelen hozzászólás azonosító.",
      });
    }

    const pool = await poolPromise;
    const replyLookup = await pool
      .request()
      .input("hozzaszolasId", sql.Int, hozzaszolasId)
      .query(`
        SELECT
          h.HozzaszolasId,
          h.FelhasznaloId,
          LEFT(NULLIF(LTRIM(RTRIM(h.Szoveg)), N''), 120) AS Reszlet,
          t.Cim AS TemaCim
        FROM ForumHozzaszolas h
        INNER JOIN ForumTema t ON t.TemaId = h.TemaId
        WHERE h.HozzaszolasId = @hozzaszolasId
      `);

    const reply = replyLookup.recordset[0];

    if (!reply) {
      return res.status(404).json({
        message: "Hozzászólás nem található.",
      });
    }

    const result = await pool
      .request()
      .input("hozzaszolasId", sql.Int, hozzaszolasId)
      .query(`
        DELETE FROM ForumHozzaszolas
        OUTPUT DELETED.HozzaszolasId
        WHERE HozzaszolasId = @hozzaszolasId
      `);

    const replyLabel = String(reply.Reszlet || "").trim()
      ? `"${String(reply.Reszlet).trim()}"`
      : "egy hozzászólásodat";

    await createUserNotification({
      recipientUserId: Number(reply.FelhasznaloId),
      adminUserId: Number(req.user?.id),
      type: "forum-reply-deleted",
      title: "Fórum hozzászólás törölve",
      body: `Az admin törölte ${replyLabel} a(z) "${String(reply.TemaCim || "").trim() || "Ismeretlen téma"}" témából.`,
    });

    return res.status(200).json({
      message: "Hozzászólás sikeresen törölve.",
    });
  } catch (error) {
    console.error("Hozzaszolas torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a hozzászólás törlésekor.",
    });
  }
}

module.exports = {
  getTopics,
  createTopic,
  getTopicReplies,
  createReply,
  getTopicsForAdmin,
  getRepliesForAdmin,
  deleteTopic,
  deleteReply,
};


