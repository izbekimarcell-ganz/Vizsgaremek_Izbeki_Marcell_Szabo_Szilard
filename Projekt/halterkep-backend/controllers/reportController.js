const { sql, poolPromise } = require("../DbConfig");

const REPORT_REASON_CODES = new Set([
  "spam",
  "offensive",
  "harassment",
  "misleading",
  "off_topic",
  "other",
]);

function normalizeText(value, maxLength) {
  const normalized = String(value || "").trim();
  if (!maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength);
}

function buildTopicJumpUrl(temaId, hozzaszolasId) {
  const params = new URLSearchParams();

  if (Number.isInteger(temaId) && temaId > 0) {
    params.set("temaId", String(temaId));
  }

  if (Number.isInteger(hozzaszolasId) && hozzaszolasId > 0) {
    params.set("hozzaszolasId", String(hozzaszolasId));
  }

  const query = params.toString();
  return query ? `forum.html?${query}` : "forum.html";
}

async function createForumReport(req, res) {
  try {
    const reporterUserId = Number.parseInt(req.user?.id, 10);
    const targetType = normalizeText(req.body?.targetType, 20).toLowerCase();
    const targetId = Number.parseInt(req.body?.targetId, 10);
    const reasonCode = normalizeText(req.body?.reasonCode, 40).toLowerCase();
    const details = normalizeText(req.body?.details, 1000);

    if (Number.isNaN(reporterUserId) || reporterUserId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezes szukseges.",
      });
    }

    if (!["topic", "reply"].includes(targetType) || Number.isNaN(targetId) || targetId <= 0) {
      return res.status(400).json({
        message: "Ervenytelen report celpont.",
      });
    }

    if (!REPORT_REASON_CODES.has(reasonCode)) {
      return res.status(400).json({
        message: "Ervenytelen report indok.",
      });
    }

    if (reasonCode === "other" && details.length < 3) {
      return res.status(400).json({
        message: "Az Egyeb indoknal a reszletezes megadasa kotelezo.",
      });
    }

    const pool = await poolPromise;
    let targetRow;

    if (targetType === "topic") {
      const result = await pool
        .request()
        .input("targetId", sql.Int, targetId)
        .query(`
          SELECT
            t.TemaId,
            t.Cim AS TemaCim,
            f.Felhasznalonev AS CelFelhasznalonev
          FROM ForumTema t
          INNER JOIN Felhasznalo f ON f.FelhasznaloId = t.FelhasznaloId
          WHERE t.TemaId = @targetId
        `);

      targetRow = result.recordset[0];
    } else {
      const result = await pool
        .request()
        .input("targetId", sql.Int, targetId)
        .query(`
          SELECT
            h.HozzaszolasId,
            h.TemaId,
            t.Cim AS TemaCim,
            LEFT(COALESCE(NULLIF(h.Szoveg, N''), CASE WHEN h.KepUrl IS NOT NULL THEN N'Csak kepes hozzaszolas.' ELSE N'' END), 1000) AS CelSzoveg,
            f.Felhasznalonev AS CelFelhasznalonev
          FROM ForumHozzaszolas h
          INNER JOIN ForumTema t ON t.TemaId = h.TemaId
          INNER JOIN Felhasznalo f ON f.FelhasznaloId = h.FelhasznaloId
          WHERE h.HozzaszolasId = @targetId
        `);

      targetRow = result.recordset[0];
    }

    if (!targetRow) {
      return res.status(404).json({
        message: "A reportolni kivant tartalom nem talalhato.",
      });
    }

    await pool
      .request()
      .input("felhasznaloId", sql.Int, reporterUserId)
      .input("celTipus", sql.NVarChar(20), targetType)
      .input("temaId", sql.Int, targetRow.TemaId || null)
      .input("hozzaszolasId", sql.Int, targetType === "reply" ? targetRow.HozzaszolasId : null)
      .input("temaCim", sql.NVarChar(150), normalizeText(targetRow.TemaCim, 150))
      .input("celFelhasznalonev", sql.NVarChar(50), normalizeText(targetRow.CelFelhasznalonev, 50) || null)
      .input("celSzoveg", sql.NVarChar(1000), normalizeText(targetRow.CelSzoveg, 1000) || null)
      .input("indokKod", sql.NVarChar(40), reasonCode)
      .input("reszletezes", sql.NVarChar(1000), details || null)
      .query(`
        INSERT INTO ForumReport
          (
            FelhasznaloId,
            CelTipus,
            TemaId,
            HozzaszolasId,
            TemaCim,
            CelFelhasznalonev,
            CelSzoveg,
            IndokKod,
            Reszletezes
          )
        VALUES
          (
            @felhasznaloId,
            @celTipus,
            @temaId,
            @hozzaszolasId,
            @temaCim,
            @celFelhasznalonev,
            @celSzoveg,
            @indokKod,
            @reszletezes
          )
      `);

    return res.status(201).json({
      message: "A report sikeresen elkuldve.",
    });
  } catch (error) {
    console.error("Forum report kuldesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a report elkuldese kozben.",
    });
  }
}

async function getAdminReportNotifications(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        ForumReportId,
        Letrehozva
      FROM ForumReport
      WHERE AdminTorolve = 0
        AND AdminOlvasva = 0
      ORDER BY Letrehozva DESC, ForumReportId DESC
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Admin forum report ertesites hiba:", error);
    return res.status(500).json({
      message: "Hiba az admin report ertesitesek lekeresekor.",
    });
  }
}

async function getAdminReports(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        r.ForumReportId,
        r.CelTipus,
        r.TemaId,
        r.HozzaszolasId,
        r.TemaCim,
        r.CelFelhasznalonev,
        r.IndokKod,
        r.Reszletezes,
        r.Letrehozva,
        r.AdminOlvasva,
        r.AdminValasz,
        r.AdminValaszLetrehozva,
        f.Felhasznalonev AS ReportoloFelhasznalonev
      FROM ForumReport r
      INNER JOIN Felhasznalo f ON f.FelhasznaloId = r.FelhasznaloId
      WHERE r.AdminTorolve = 0
      ORDER BY
        CASE WHEN r.AdminOlvasva = 0 THEN 0 ELSE 1 END,
        r.Letrehozva DESC,
        r.ForumReportId DESC
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Admin report lista lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a reportok lekeresekor.",
    });
  }
}

async function getAdminReportDetail(req, res) {
  try {
    const reportId = Number.parseInt(req.params.reportId, 10);

    if (Number.isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({
        message: "Ervenytelen report azonosito.",
      });
    }

    const pool = await poolPromise;
    await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .query(`
        UPDATE ForumReport
        SET AdminOlvasva = 1
        WHERE ForumReportId = @reportId
          AND AdminTorolve = 0
      `);

    const result = await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .query(`
        SELECT
          r.ForumReportId,
          r.CelTipus,
          r.TemaId,
          r.HozzaszolasId,
          r.TemaCim,
          r.CelFelhasznalonev,
          r.CelSzoveg,
          r.IndokKod,
          r.Reszletezes,
          r.Letrehozva,
          r.AdminOlvasva,
          r.AdminValasz,
          r.AdminValaszLetrehozva,
          f.Felhasznalonev AS ReportoloFelhasznalonev
        FROM ForumReport r
        INNER JOIN Felhasznalo f ON f.FelhasznaloId = r.FelhasznaloId
        WHERE r.ForumReportId = @reportId
          AND r.AdminTorolve = 0
      `);

    const report = result.recordset[0];

    if (!report) {
      return res.status(404).json({
        message: "A report nem talalhato.",
      });
    }

    return res.status(200).json({
      ...report,
      UgrasUrl: buildTopicJumpUrl(
        Number.parseInt(report.TemaId, 10),
        Number.parseInt(report.HozzaszolasId, 10)
      ),
    });
  } catch (error) {
    console.error("Admin report reszlet lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a report reszleteinek lekeresekor.",
    });
  }
}

async function replyToReport(req, res) {
  try {
    const reportId = Number.parseInt(req.params.reportId, 10);
    const adminReply = normalizeText(req.body?.adminReply, 2000);

    if (Number.isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({
        message: "Ervenytelen report azonosito.",
      });
    }

    if (!adminReply) {
      return res.status(400).json({
        message: "Az admin valasz nem lehet ures.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .input("adminReply", sql.NVarChar(2000), adminReply)
      .query(`
        UPDATE ForumReport
        SET
          AdminValasz = @adminReply,
          AdminValaszLetrehozva = SYSUTCDATETIME(),
          FelhasznaloOlvastaValaszt = 0,
          AdminOlvasva = 1
        OUTPUT INSERTED.ForumReportId
        WHERE ForumReportId = @reportId
          AND AdminTorolve = 0
      `);

    if (!result.recordset.length) {
      return res.status(404).json({
        message: "A report nem talalhato.",
      });
    }

    return res.status(200).json({
      message: "Az admin valasz sikeresen elkuldve.",
    });
  } catch (error) {
    console.error("Admin report valasz kuldesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a valasz elkuldese kozben.",
    });
  }
}

async function deleteAdminReport(req, res) {
  try {
    const reportId = Number.parseInt(req.params.reportId, 10);

    if (Number.isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({
        message: "Ervenytelen report azonosito.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .query(`
        UPDATE ForumReport
        SET AdminTorolve = 1
        OUTPUT INSERTED.ForumReportId
        WHERE ForumReportId = @reportId
          AND AdminTorolve = 0
      `);

    if (!result.recordset.length) {
      return res.status(404).json({
        message: "A report nem talalhato.",
      });
    }

    return res.status(200).json({
      message: "A report sikeresen torolve.",
    });
  } catch (error) {
    console.error("Admin report torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a report torlesekor.",
    });
  }
}

async function getUserReportMessages(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);

    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezes szukseges.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT
          ForumReportId,
          IndokKod,
          Reszletezes,
          Letrehozva,
          AdminValaszLetrehozva,
          FelhasznaloOlvastaValaszt
        FROM ForumReport
        WHERE FelhasznaloId = @userId
          AND AdminValasz IS NOT NULL
          AND FelhasznaloTorolve = 0
        ORDER BY AdminValaszLetrehozva DESC, ForumReportId DESC
      `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Felhasznaloi report uzenetek lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenetek lekeresekor.",
    });
  }
}

async function getUserReportMessageDetail(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);
    const reportId = Number.parseInt(req.params.reportId, 10);

    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezes szukseges.",
      });
    }

    if (Number.isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({
        message: "Ervenytelen uzenet azonosito.",
      });
    }

    const pool = await poolPromise;
    await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .input("userId", sql.Int, userId)
      .query(`
        UPDATE ForumReport
        SET FelhasznaloOlvastaValaszt = 1
        WHERE ForumReportId = @reportId
          AND FelhasznaloId = @userId
          AND FelhasznaloTorolve = 0
          AND AdminValasz IS NOT NULL
      `);

    const result = await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .input("userId", sql.Int, userId)
      .query(`
        SELECT
          ForumReportId,
          IndokKod,
          Reszletezes,
          Letrehozva,
          AdminValasz,
          AdminValaszLetrehozva
        FROM ForumReport
        WHERE ForumReportId = @reportId
          AND FelhasznaloId = @userId
          AND FelhasznaloTorolve = 0
          AND AdminValasz IS NOT NULL
      `);

    const message = result.recordset[0];

    if (!message) {
      return res.status(404).json({
        message: "Az uzenet nem talalhato.",
      });
    }

    return res.status(200).json(message);
  } catch (error) {
    console.error("Felhasznaloi report uzenet reszlet hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenet megnyitasakor.",
    });
  }
}

async function deleteUserReportMessage(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);
    const reportId = Number.parseInt(req.params.reportId, 10);

    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezes szukseges.",
      });
    }

    if (Number.isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({
        message: "Ervenytelen uzenet azonosito.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .input("userId", sql.Int, userId)
      .query(`
        UPDATE ForumReport
        SET FelhasznaloTorolve = 1
        OUTPUT INSERTED.ForumReportId
        WHERE ForumReportId = @reportId
          AND FelhasznaloId = @userId
          AND FelhasznaloTorolve = 0
          AND AdminValasz IS NOT NULL
      `);

    if (!result.recordset.length) {
      return res.status(404).json({
        message: "Az uzenet nem talalhato.",
      });
    }

    return res.status(200).json({
      message: "Az uzenet sikeresen torolve.",
    });
  } catch (error) {
    console.error("Felhasznaloi report uzenet torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenet torlesekor.",
    });
  }
}

module.exports = {
  REPORT_REASON_CODES,
  createForumReport,
  getAdminReportNotifications,
  getAdminReports,
  getAdminReportDetail,
  replyToReport,
  deleteAdminReport,
  getUserReportMessages,
  getUserReportMessageDetail,
  deleteUserReportMessage,
};
