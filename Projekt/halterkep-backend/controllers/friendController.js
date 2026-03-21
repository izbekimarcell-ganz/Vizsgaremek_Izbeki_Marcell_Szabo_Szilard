const { sql, poolPromise } = require("../DbConfig");

function normalizeText(value, maxLength = 0) {
  const normalized = String(value || "").trim();
  return maxLength > 0 ? normalized.slice(0, maxLength) : normalized;
}

async function getExistingFriendRequest(connection, userId, otherUserId) {
  const lowId = Math.min(userId, otherUserId);
  const highId = Math.max(userId, otherUserId);

  const result = await new sql.Request(connection)
    .input("lowId", sql.Int, lowId)
    .input("highId", sql.Int, highId)
    .query(`
      SELECT TOP 1
        BaratKerelemId,
        KezdemenyezoFelhasznaloId,
        CimzettFelhasznaloId,
        Allapot,
        Letrehozva,
        Valaszolva
      FROM BaratKerelem
      WHERE FelhasznaloEgyId = @lowId
        AND FelhasznaloKettoId = @highId
    `);

  return result.recordset[0] || null;
}

async function getAcceptedFriendRelation(connection, userId, otherUserId) {
  const existingRequest = await getExistingFriendRequest(connection, userId, otherUserId);
  return existingRequest && existingRequest.Allapot === "accepted" ? existingRequest : null;
}

async function getFriendConversationContext(connection, userId, messageId) {
  const result = await new sql.Request(connection)
    .input("messageId", sql.Int, messageId)
    .input("userId", sql.Int, userId)
    .query(`
      SELECT TOP 1
        bu.BaratUzenetId,
        CASE
          WHEN bu.KuldoFelhasznaloId = @userId THEN bu.CimzettFelhasznaloId
          ELSE bu.KuldoFelhasznaloId
        END AS MasikFelhasznaloId,
        masik.Felhasznalonev AS MasikFelhasznalonev
      FROM BaratUzenet bu
      INNER JOIN Felhasznalo masik
        ON masik.FelhasznaloId = CASE
          WHEN bu.KuldoFelhasznaloId = @userId THEN bu.CimzettFelhasznaloId
          ELSE bu.KuldoFelhasznaloId
        END
      WHERE bu.BaratUzenetId = @messageId
        AND (
          (bu.KuldoFelhasznaloId = @userId AND bu.KuldoTorolve = 0)
          OR (bu.CimzettFelhasznaloId = @userId AND bu.CimzettTorolve = 0)
        )
        AND EXISTS
        (
          SELECT 1
          FROM BaratKerelem bk
          WHERE bk.Allapot = 'accepted'
            AND bk.FelhasznaloEgyId = CASE
              WHEN @userId < CASE
                WHEN bu.KuldoFelhasznaloId = @userId THEN bu.CimzettFelhasznaloId
                ELSE bu.KuldoFelhasznaloId
              END THEN @userId
              ELSE CASE
                WHEN bu.KuldoFelhasznaloId = @userId THEN bu.CimzettFelhasznaloId
                ELSE bu.KuldoFelhasznaloId
              END
            END
            AND bk.FelhasznaloKettoId = CASE
              WHEN @userId < CASE
                WHEN bu.KuldoFelhasznaloId = @userId THEN bu.CimzettFelhasznaloId
                ELSE bu.KuldoFelhasznaloId
              END THEN CASE
                WHEN bu.KuldoFelhasznaloId = @userId THEN bu.CimzettFelhasznaloId
                ELSE bu.KuldoFelhasznaloId
              END
              ELSE @userId
            END
        )
    `);

  return result.recordset[0] || null;
}

async function getFriendOverview(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);

    if (Number.isNaN(userId)) {
      return res.status(401).json({
        message: "Bejelentkezés szükséges.",
      });
    }

    const pool = await poolPromise;

    const [allUsersResult, friendsResult, pendingSentResult, pendingReceivedResult] = await Promise.all([
      pool.request().input("userId", sql.Int, userId).query(`
        SELECT FelhasznaloId, Felhasznalonev
        FROM Felhasznalo
        WHERE FelhasznaloId <> @userId
          AND Aktiv = 1
          AND Admin = 0
        ORDER BY Felhasznalonev ASC
      `),
      pool.request().input("userId", sql.Int, userId).query(`
        SELECT DISTINCT
          other.FelhasznaloId,
          other.Felhasznalonev
        FROM BaratKerelem bk
        CROSS APPLY (
          SELECT CASE
            WHEN bk.KezdemenyezoFelhasznaloId = @userId THEN bk.CimzettFelhasznaloId
            ELSE bk.KezdemenyezoFelhasznaloId
          END AS OtherUserId
        ) relation
        INNER JOIN Felhasznalo other ON other.FelhasznaloId = relation.OtherUserId
        WHERE bk.Allapot = 'accepted'
          AND @userId IN (bk.KezdemenyezoFelhasznaloId, bk.CimzettFelhasznaloId)
          AND other.Aktiv = 1
          AND other.Admin = 0
        ORDER BY other.Felhasznalonev ASC
      `),
      pool.request().input("userId", sql.Int, userId).query(`
        SELECT CimzettFelhasznaloId AS FelhasznaloId
        FROM BaratKerelem
        WHERE KezdemenyezoFelhasznaloId = @userId
          AND Allapot = 'pending'
      `),
      pool.request().input("userId", sql.Int, userId).query(`
        SELECT
          bk.BaratKerelemId,
          bk.KezdemenyezoFelhasznaloId AS FeladoFelhasznaloId,
          f.Felhasznalonev,
          bk.Letrehozva
        FROM BaratKerelem bk
        INNER JOIN Felhasznalo f ON f.FelhasznaloId = bk.KezdemenyezoFelhasznaloId
        WHERE bk.CimzettFelhasznaloId = @userId
          AND bk.Allapot = 'pending'
          AND f.Aktiv = 1
          AND f.Admin = 0
        ORDER BY bk.Letrehozva DESC
      `),
    ]);

    const friendIds = new Set(
      friendsResult.recordset.map((item) => Number(item.FelhasznaloId))
    );

    const nonFriends = allUsersResult.recordset.filter(
      (item) => !friendIds.has(Number(item.FelhasznaloId))
    );

    return res.status(200).json({
      nonFriends,
      friends: friendsResult.recordset,
      pendingSentUserIds: pendingSentResult.recordset.map((item) => Number(item.FelhasznaloId)),
      pendingReceivedUserIds: pendingReceivedResult.recordset.map((item) => Number(item.FeladoFelhasznaloId)),
      pendingReceived: pendingReceivedResult.recordset,
    });
  } catch (error) {
    console.error("Barat attekintes lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a barátok lekérésekor.",
    });
  }
}

async function sendFriendRequest(req, res) {
  try {
    const senderUserId = Number.parseInt(req.user?.id, 10);
    const targetUserId = Number.parseInt(req.body?.targetUserId, 10);

    if (Number.isNaN(senderUserId)) {
      return res.status(401).json({
        message: "Bejelentkezés szükséges.",
      });
    }

    if (Number.isNaN(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({
        message: "Érvénytelen cél felhasználó.",
      });
    }

    if (senderUserId === targetUserId) {
      return res.status(400).json({
        message: "Magadnak nem küldhetsz barátkérelmet.",
      });
    }

    const pool = await poolPromise;
    const targetUserResult = await pool
      .request()
      .input("targetUserId", sql.Int, targetUserId)
      .query(`
        SELECT FelhasznaloId, Felhasznalonev, Aktiv, Admin
        FROM Felhasznalo
        WHERE FelhasznaloId = @targetUserId
      `);

    const targetUser = targetUserResult.recordset[0];

    if (!targetUser || !targetUser.Aktiv || targetUser.Admin) {
      return res.status(404).json({
        message: "A kiválasztott felhasználó nem elérhető.",
      });
    }

    const existingRequest = await getExistingFriendRequest(pool, senderUserId, targetUserId);

    if (existingRequest) {
      if (existingRequest.Allapot === "accepted") {
        return res.status(409).json({
          message: "Ez a felhasználó már a barátod.",
        });
      }

      if (existingRequest.Allapot === "pending") {
        const message =
          existingRequest.KezdemenyezoFelhasznaloId === senderUserId
            ? "A baratkerelmet mar elkuldted."
            : "Már kaptál barátkérelmet ettől a felhasználótól.";

        return res.status(409).json({ message });
      }

      await pool
        .request()
        .input("requestId", sql.Int, existingRequest.BaratKerelemId)
        .input("senderUserId", sql.Int, senderUserId)
        .input("targetUserId", sql.Int, targetUserId)
        .query(`
          UPDATE BaratKerelem
          SET
            KezdemenyezoFelhasznaloId = @senderUserId,
            CimzettFelhasznaloId = @targetUserId,
            Allapot = 'pending',
            Letrehozva = SYSUTCDATETIME(),
            Valaszolva = NULL
          WHERE BaratKerelemId = @requestId
        `);

      return res.status(200).json({
        message: "Barátkérelem elküldve.",
      });
    }

    await pool
      .request()
      .input("senderUserId", sql.Int, senderUserId)
      .input("targetUserId", sql.Int, targetUserId)
      .query(`
        INSERT INTO BaratKerelem (
          KezdemenyezoFelhasznaloId,
          CimzettFelhasznaloId,
          Allapot,
          Letrehozva
        )
        VALUES (
          @senderUserId,
          @targetUserId,
          'pending',
          SYSUTCDATETIME()
        )
      `);

    return res.status(201).json({
      message: "Barátkérelem elküldve.",
    });
  } catch (error) {
    console.error("Baratkeres kuldesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a barátkérés küldésekor.",
    });
  }
}

async function getFriendNotifications(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);

    if (Number.isNaN(userId)) {
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
          bk.BaratKerelemId,
          bk.KezdemenyezoFelhasznaloId AS FeladoFelhasznaloId,
          f.Felhasznalonev,
          bk.Letrehozva
        FROM BaratKerelem bk
        INNER JOIN Felhasznalo f ON f.FelhasznaloId = bk.KezdemenyezoFelhasznaloId
        WHERE bk.CimzettFelhasznaloId = @userId
          AND bk.Allapot = 'pending'
          AND f.Aktiv = 1
          AND f.Admin = 0
        ORDER BY bk.Letrehozva DESC
      `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Barat ertesitesek lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba az értesítések lekérésekor.",
    });
  }
}

async function createFriendMessage(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);
    const targetUserId = Number.parseInt(req.body?.targetUserId, 10);
    const messageText = normalizeText(req.body?.uzenet, 2000);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezes szukseges.",
      });
    }

    if (!Number.isInteger(targetUserId) || targetUserId <= 0 || targetUserId === userId) {
      return res.status(400).json({
        message: "Ervenytelen cel felhasznalo.",
      });
    }

    if (!messageText || messageText.length < 3) {
      return res.status(400).json({
        message: "Az uzenet legalabb 3 karakter legyen.",
      });
    }

    const pool = await poolPromise;
    const targetUserResult = await pool
      .request()
      .input("targetUserId", sql.Int, targetUserId)
      .query(`
        SELECT FelhasznaloId, Aktiv, Admin
        FROM Felhasznalo
        WHERE FelhasznaloId = @targetUserId
      `);

    const targetUser = targetUserResult.recordset[0];

    if (!targetUser || !targetUser.Aktiv || targetUser.Admin) {
      return res.status(404).json({
        message: "A kivalasztott felhasznalo nem erheto el.",
      });
    }

    const relation = await getAcceptedFriendRelation(pool, userId, targetUserId);

    if (!relation) {
      return res.status(403).json({
        message: "Csak elfogadott baratok kuldhetnek egymasnak uzenetet.",
      });
    }

    await pool
      .request()
      .input("kuldoFelhasznaloId", sql.Int, userId)
      .input("cimzettFelhasznaloId", sql.Int, targetUserId)
      .input("uzenetSzoveg", sql.NVarChar(2000), messageText)
      .query(`
        INSERT INTO BaratUzenet
          (
            KuldoFelhasznaloId,
            CimzettFelhasznaloId,
            UzenetSzoveg
          )
        VALUES
          (
            @kuldoFelhasznaloId,
            @cimzettFelhasznaloId,
            @uzenetSzoveg
          )
      `);

    return res.status(201).json({
      message: "Az uzenet sikeresen elkuldve.",
    });
  } catch (error) {
    console.error("Barat uzenet kuldesi hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenet kuldese kozben.",
    });
  }
}

async function getFriendMessages(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezes szukseges.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        WITH UserMessages AS
        (
          SELECT
            bu.BaratUzenetId,
            bu.KuldoFelhasznaloId,
            bu.CimzettFelhasznaloId,
            bu.UzenetSzoveg,
            bu.Letrehozva,
            bu.CimzettOlvasta,
            CASE
              WHEN bu.KuldoFelhasznaloId = @userId THEN bu.CimzettFelhasznaloId
              ELSE bu.KuldoFelhasznaloId
            END AS MasikFelhasznaloId,
            CASE
              WHEN bu.KuldoFelhasznaloId = @userId THEN bu.KuldoTorolve
              ELSE bu.CimzettTorolve
            END AS UserTorolve
          FROM BaratUzenet bu
          WHERE bu.KuldoFelhasznaloId = @userId
             OR bu.CimzettFelhasznaloId = @userId
        ),
        VisibleMessages AS
        (
          SELECT um.*
          FROM UserMessages um
          WHERE um.UserTorolve = 0
            AND EXISTS
            (
              SELECT 1
              FROM BaratKerelem bk
              WHERE bk.Allapot = 'accepted'
                AND bk.FelhasznaloEgyId = CASE
                  WHEN @userId < um.MasikFelhasznaloId THEN @userId
                  ELSE um.MasikFelhasznaloId
                END
                AND bk.FelhasznaloKettoId = CASE
                  WHEN @userId < um.MasikFelhasznaloId THEN um.MasikFelhasznaloId
                  ELSE @userId
                END
            )
        ),
        Threaded AS
        (
          SELECT
            vm.*,
            ROW_NUMBER() OVER
            (
              PARTITION BY vm.MasikFelhasznaloId
              ORDER BY vm.Letrehozva DESC, vm.BaratUzenetId DESC
            ) AS RowNum,
            SUM(
              CASE
                WHEN vm.CimzettFelhasznaloId = @userId AND vm.CimzettOlvasta = 0 THEN 1
                ELSE 0
              END
            ) OVER (PARTITION BY vm.MasikFelhasznaloId) AS OlvasatlanDb
          FROM VisibleMessages vm
        )
        SELECT
          t.BaratUzenetId,
          t.MasikFelhasznaloId,
          t.UzenetSzoveg AS UtolsoUzenetSzoveg,
          t.Letrehozva,
          t.OlvasatlanDb,
          masik.Felhasznalonev AS MasikFelhasznalonev,
          CASE WHEN t.KuldoFelhasznaloId = @userId THEN 1 ELSE 0 END AS SajatUtolsoUzenet
        FROM Threaded t
        INNER JOIN Felhasznalo masik
          ON masik.FelhasznaloId = t.MasikFelhasznaloId
        WHERE t.RowNum = 1
          AND masik.Aktiv = 1
          AND masik.Admin = 0
        ORDER BY
          CASE WHEN t.OlvasatlanDb > 0 THEN 0 ELSE 1 END,
          t.Letrehozva DESC,
          t.BaratUzenetId DESC
      `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Barat uzenetek lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenetek lekeresekor.",
    });
  }
}

async function getFriendMessageDetail(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);
    const messageId = Number.parseInt(req.params?.messageId, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezes szukseges.",
      });
    }

    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({
        message: "Ervenytelen uzenet azonosito.",
      });
    }

    const pool = await poolPromise;
    const context = await getFriendConversationContext(pool, userId, messageId);

    if (!context) {
      return res.status(404).json({
        message: "Az uzenet nem talalhato.",
      });
    }

    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("otherUserId", sql.Int, Number(context.MasikFelhasznaloId))
      .query(`
        UPDATE BaratUzenet
        SET CimzettOlvasta = 1
        WHERE KuldoFelhasznaloId = @otherUserId
          AND CimzettFelhasznaloId = @userId
          AND CimzettTorolve = 0
      `);

    const messagesResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("otherUserId", sql.Int, Number(context.MasikFelhasznaloId))
      .query(`
        SELECT
          bu.BaratUzenetId,
          bu.KuldoFelhasznaloId,
          bu.CimzettFelhasznaloId,
          bu.UzenetSzoveg,
          bu.Letrehozva,
          CASE WHEN bu.KuldoFelhasznaloId = @userId THEN 1 ELSE 0 END AS SajatUzenet,
          kuldo.Felhasznalonev AS KuldoFelhasznalonev
        FROM BaratUzenet bu
        INNER JOIN Felhasznalo kuldo
          ON kuldo.FelhasznaloId = bu.KuldoFelhasznaloId
        WHERE
          (
            (bu.KuldoFelhasznaloId = @userId AND bu.CimzettFelhasznaloId = @otherUserId AND bu.KuldoTorolve = 0)
            OR (bu.KuldoFelhasznaloId = @otherUserId AND bu.CimzettFelhasznaloId = @userId AND bu.CimzettTorolve = 0)
          )
          AND EXISTS
          (
            SELECT 1
            FROM BaratKerelem bk
            WHERE bk.Allapot = 'accepted'
              AND bk.FelhasznaloEgyId = CASE WHEN @userId < @otherUserId THEN @userId ELSE @otherUserId END
              AND bk.FelhasznaloKettoId = CASE WHEN @userId < @otherUserId THEN @otherUserId ELSE @userId END
          )
        ORDER BY bu.Letrehozva ASC, bu.BaratUzenetId ASC
      `);

    return res.status(200).json({
      BaratUzenetId: Number(context.BaratUzenetId),
      MasikFelhasznaloId: Number(context.MasikFelhasznaloId),
      MasikFelhasznalonev: context.MasikFelhasznalonev || null,
      Uzenetek: messagesResult.recordset,
    });
  } catch (error) {
    console.error("Barat uzenet reszlet hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenet megnyitasa kozben.",
    });
  }
}

async function replyToFriendMessage(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);
    const messageId = Number.parseInt(req.params?.messageId, 10);
    const messageText = normalizeText(req.body?.uzenet, 2000);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezes szukseges.",
      });
    }

    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({
        message: "Ervenytelen uzenet azonosito.",
      });
    }

    if (!messageText || messageText.length < 3) {
      return res.status(400).json({
        message: "Az uzenet legalabb 3 karakter legyen.",
      });
    }

    const pool = await poolPromise;
    const context = await getFriendConversationContext(pool, userId, messageId);

    if (!context) {
      return res.status(404).json({
        message: "Az uzenet nem talalhato.",
      });
    }

    const relation = await getAcceptedFriendRelation(pool, userId, Number(context.MasikFelhasznaloId));

    if (!relation) {
      return res.status(403).json({
        message: "Csak elfogadott baratok kuldhetnek egymasnak uzenetet.",
      });
    }

    await pool
      .request()
      .input("kuldoFelhasznaloId", sql.Int, userId)
      .input("cimzettFelhasznaloId", sql.Int, Number(context.MasikFelhasznaloId))
      .input("uzenetSzoveg", sql.NVarChar(2000), messageText)
      .query(`
        INSERT INTO BaratUzenet
          (
            KuldoFelhasznaloId,
            CimzettFelhasznaloId,
            UzenetSzoveg
          )
        VALUES
          (
            @kuldoFelhasznaloId,
            @cimzettFelhasznaloId,
            @uzenetSzoveg
          )
      `);

    return res.status(201).json({
      message: "Az uzenet sikeresen elkuldve.",
    });
  } catch (error) {
    console.error("Barat uzenet valasz kuldesi hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenet kuldese kozben.",
    });
  }
}

async function deleteFriendMessage(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);
    const messageId = Number.parseInt(req.params?.messageId, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Bejelentkezes szukseges.",
      });
    }

    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({
        message: "Ervenytelen uzenet azonosito.",
      });
    }

    const pool = await poolPromise;
    const context = await getFriendConversationContext(pool, userId, messageId);

    if (!context) {
      return res.status(404).json({
        message: "Az uzenet nem talalhato.",
      });
    }

    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("otherUserId", sql.Int, Number(context.MasikFelhasznaloId))
      .query(`
        UPDATE BaratUzenet
        SET
          KuldoTorolve = CASE WHEN KuldoFelhasznaloId = @userId THEN 1 ELSE KuldoTorolve END,
          CimzettTorolve = CASE WHEN CimzettFelhasznaloId = @userId THEN 1 ELSE CimzettTorolve END
        WHERE
          (KuldoFelhasznaloId = @userId AND CimzettFelhasznaloId = @otherUserId AND KuldoTorolve = 0)
          OR (KuldoFelhasznaloId = @otherUserId AND CimzettFelhasznaloId = @userId AND CimzettTorolve = 0)
      `);

    return res.status(200).json({
      message: "Az uzenet sikeresen torolve.",
    });
  } catch (error) {
    console.error("Barat uzenet torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenet torlese kozben.",
    });
  }
}

async function respondToFriendRequest(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);
    const requestId = Number.parseInt(req.params.id, 10);
    const action = String(req.body?.action || "").trim().toLowerCase();

    if (Number.isNaN(userId)) {
      return res.status(401).json({
        message: "Bejelentkezés szükséges.",
      });
    }

    if (Number.isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({
        message: "Érvénytelen kérelem azonosító.",
      });
    }

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        message: "Érvénytelen művelet.",
      });
    }

    const pool = await poolPromise;
    const existingResult = await pool
      .request()
      .input("requestId", sql.Int, requestId)
      .input("userId", sql.Int, userId)
      .query(`
        SELECT BaratKerelemId, Allapot
        FROM BaratKerelem
        WHERE BaratKerelemId = @requestId
          AND CimzettFelhasznaloId = @userId
      `);

    const requestRow = existingResult.recordset[0];

    if (!requestRow) {
      return res.status(404).json({
        message: "Barátkérelem nem található.",
      });
    }

    if (requestRow.Allapot !== "pending") {
      return res.status(400).json({
        message: "Ez a barátkérelem már feldolgozásra került.",
      });
    }

    const nextStatus = action === "accept" ? "accepted" : "rejected";

    await pool
      .request()
      .input("requestId", sql.Int, requestId)
      .input("nextStatus", sql.NVarChar(20), nextStatus)
      .query(`
        UPDATE BaratKerelem
        SET
          Allapot = @nextStatus,
          Valaszolva = SYSUTCDATETIME()
        WHERE BaratKerelemId = @requestId
      `);

    return res.status(200).json({
      message: action === "accept" ? "Barátkérelem elfogadva." : "Barátkérelem elutasítva.",
    });
  } catch (error) {
    console.error("Baratkeres valasz hiba:", error);
    return res.status(500).json({
      message: "Hiba a barátkérés feldolgozásakor.",
    });
  }
}

async function removeFriend(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);
    const otherUserId = Number.parseInt(req.params.userId, 10);

    if (Number.isNaN(userId)) {
      return res.status(401).json({
        message: "Bejelentkezés szükséges.",
      });
    }

    if (Number.isNaN(otherUserId) || otherUserId <= 0 || userId === otherUserId) {
      return res.status(400).json({
        message: "Érvénytelen felhasználó azonosító.",
      });
    }

    const pool = await poolPromise;
    const existingRequest = await getExistingFriendRequest(pool, userId, otherUserId);

    if (!existingRequest || existingRequest.Allapot !== "accepted") {
      return res.status(404).json({
        message: "A baráti kapcsolat nem található.",
      });
    }

    await pool
      .request()
      .input("requestId", sql.Int, existingRequest.BaratKerelemId)
      .query(`
        DELETE FROM BaratKerelem
        WHERE BaratKerelemId = @requestId
      `);

    return res.status(200).json({
      message: "A barát sikeresen törölve lett.",
    });
  } catch (error) {
    console.error("Barat torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a barát törlésekor.",
    });
  }
}

module.exports = {
  getFriendOverview,
  sendFriendRequest,
  getFriendNotifications,
  createFriendMessage,
  getFriendMessages,
  getFriendMessageDetail,
  replyToFriendMessage,
  deleteFriendMessage,
  respondToFriendRequest,
  removeFriend,
};
