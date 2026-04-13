const { sql, poolPromise } = require("../DbConfig");
const {
  getAuthenticatedUserId,
  normalizeText,
  parsePositiveInt,
} = require("../utils/requestHelpers");

const REPORT_REASON_CODES = new Set([
  "spam",
  "offensive",
  "harassment",
  "misleading",
  "off_topic",
  "other",
]);

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
    const reporterUserId = getAuthenticatedUserId(req);
    const targetType = normalizeText(req.body?.targetType, 20).toLowerCase();
    const targetId = Number.parseInt(req.body?.targetId, 10);
    const reasonCode = normalizeText(req.body?.reasonCode, 40).toLowerCase();
    const details = normalizeText(req.body?.details, 1000);

    if (Number.isNaN(reporterUserId) || reporterUserId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezés szükséges.",
      });
    }

    if (!["topic", "reply"].includes(targetType) || Number.isNaN(targetId) || targetId <= 0) {
      return res.status(400).json({
        message: "Érvénytelen bejelentési célpont.",
      });
    }

    if (!REPORT_REASON_CODES.has(reasonCode)) {
      return res.status(400).json({
        message: "Érvénytelen bejelentési indok.",
      });
    }

    if (reasonCode === "other" && details.length < 3) {
      return res.status(400).json({
        message: "Az Egyéb indoknál a részletezés megadása kötelező.",
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
            LEFT(COALESCE(NULLIF(h.Szoveg, N''), CASE WHEN h.KepUrl IS NOT NULL THEN N'Csak képes hozzászólás.' ELSE N'' END), 1000) AS CelSzoveg,
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
        message: "A bejelenteni kívánt tartalom nem található.",
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
      message: "A bejelentés sikeresen elküldve.",
    });
  } catch (error) {
    console.error("Fórumbejelentés-küldési hiba:", error);
    return res.status(500).json({
      message: "Hiba a bejelentés elküldése közben.",
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
    console.error("Adminisztrációs fórumbejelentés-értesítési hiba:", error);
    return res.status(500).json({
      message: "Hiba az adminisztrációs bejelentésértesítések lekérésekor.",
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
    console.error("Adminisztrációs bejelentéslista lekérési hiba:", error);
    return res.status(500).json({
      message: "Hiba a bejelentések lekérésekor.",
    });
  }
}

async function getAdminReportDetail(req, res) {
  try {
    const reportId = parsePositiveInt(req.params.reportId);

    if (Number.isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({
        message: "Érvénytelen bejelentés-azonosító.",
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
        message: "A bejelentés nem található.",
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
    console.error("Adminisztrációs bejelentés részlet lekérési hiba:", error);
    return res.status(500).json({
      message: "Hiba a bejelentés részleteinek lekérésekor.",
    });
  }
}

async function replyToReport(req, res) {
  try {
    const reportId = parsePositiveInt(req.params.reportId);
    const adminReply = normalizeText(req.body?.adminReply, 2000);

    if (Number.isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({
        message: "Érvénytelen bejelentés-azonosító.",
      });
    }

    if (!adminReply) {
      return res.status(400).json({
        message: "Az admin válasz nem lehet üres.",
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
        message: "A bejelentés nem található.",
      });
    }

    return res.status(200).json({
      message: "Az adminisztrátori válasz sikeresen elküldve.",
    });
  } catch (error) {
    console.error("Adminisztrációs bejelentés válaszküldési hiba:", error);
    return res.status(500).json({
      message: "Hiba a válasz elküldése közben.",
    });
  }
}

async function deleteAdminReport(req, res) {
  try {
    const reportId = parsePositiveInt(req.params.reportId);

    if (Number.isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({
        message: "Érvénytelen bejelentés-azonosító.",
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
        message: "A bejelentés nem található.",
      });
    }

    return res.status(200).json({
      message: "A bejelentés sikeresen törölve.",
    });
  } catch (error) {
    console.error("Adminisztrációs bejelentés törlési hiba:", error);
    return res.status(500).json({
      message: "Hiba a bejelentés törlésekor.",
    });
  }
}

async function getUserReportMessages(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezés szükséges.",
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
    console.error("Felhasználói bejelentésüzenetek lekérési hibája:", error);
    return res.status(500).json({
      message: "Hiba az üzenetek lekérésekor.",
    });
  }
}

async function getUserReportMessageDetail(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const reportId = parsePositiveInt(req.params.reportId);

    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezés szükséges.",
      });
    }

    if (Number.isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({
        message: "Érvénytelen üzenet azonosító.",
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
        message: "Az üzenet nem található.",
      });
    }

    return res.status(200).json(message);
  } catch (error) {
    console.error("Felhasználói bejelentésüzenet részlet hibája:", error);
    return res.status(500).json({
      message: "Hiba az üzenet megnyitásakor.",
    });
  }
}

async function deleteUserReportMessage(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const reportId = parsePositiveInt(req.params.reportId);

    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezés szükséges.",
      });
    }

    if (Number.isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({
        message: "Érvénytelen üzenet azonosító.",
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
        message: "Az üzenet nem található.",
      });
    }

    return res.status(200).json({
      message: "Az üzenet sikeresen törölve.",
    });
  } catch (error) {
    console.error("Felhasználói bejelentésüzenet törlési hibája:", error);
    return res.status(500).json({
      message: "Hiba az üzenet törlésekor.",
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
