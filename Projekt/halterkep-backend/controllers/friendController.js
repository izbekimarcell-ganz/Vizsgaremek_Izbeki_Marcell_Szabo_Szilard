const { sql, poolPromise } = require("../DbConfig");

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
  respondToFriendRequest,
  removeFriend,
};


