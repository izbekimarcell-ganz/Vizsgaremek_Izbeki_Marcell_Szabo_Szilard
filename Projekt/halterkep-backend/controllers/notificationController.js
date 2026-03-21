const { sql, poolPromise } = require("../DbConfig");

function normalizeText(value, maxLength = 0) {
  const normalized = String(value || "").trim();
  return maxLength > 0 ? normalized.slice(0, maxLength) : normalized;
}

async function createUserNotification({
  recipientUserId,
  adminUserId = null,
  type,
  title,
  body,
  jumpUrl = null,
}) {
  const numericRecipientUserId = Number.parseInt(recipientUserId, 10);

  if (!Number.isInteger(numericRecipientUserId) || numericRecipientUserId <= 0) {
    return null;
  }

  const normalizedType = normalizeText(type, 40);
  const normalizedTitle = normalizeText(title, 150);
  const normalizedBody = normalizeText(body, 2000);
  const normalizedJumpUrl = normalizeText(jumpUrl, 300) || null;
  const normalizedAdminUserId = Number.isInteger(Number(adminUserId)) && Number(adminUserId) > 0
    ? Number(adminUserId)
    : null;

  if (!normalizedType || !normalizedTitle || !normalizedBody) {
    return null;
  }

  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("cimzettFelhasznaloId", sql.Int, numericRecipientUserId)
    .input("feladoAdminFelhasznaloId", sql.Int, normalizedAdminUserId)
    .input("tipus", sql.NVarChar(40), normalizedType)
    .input("cim", sql.NVarChar(150), normalizedTitle)
    .input("szoveg", sql.NVarChar(2000), normalizedBody)
    .input("hivatkozasUrl", sql.NVarChar(300), normalizedJumpUrl)
    .query(`
      INSERT INTO FelhasznaloErtesites
        (
          CimzettFelhasznaloId,
          FeladoAdminFelhasznaloId,
          Tipus,
          Cim,
          Szoveg,
          HivatkozasUrl
        )
      OUTPUT INSERTED.FelhasznaloErtesitesId
      VALUES
        (
          @cimzettFelhasznaloId,
          @feladoAdminFelhasznaloId,
          @tipus,
          @cim,
          @szoveg,
          @hivatkozasUrl
        )
    `);

  return result.recordset[0] || null;
}

async function getNotifications(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ message: "Bejelentkezés szükséges." });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT
          FelhasznaloErtesitesId,
          Tipus,
          Cim,
          Szoveg,
          HivatkozasUrl,
          Letrehozva,
          Olvasva
        FROM FelhasznaloErtesites
        WHERE CimzettFelhasznaloId = @userId
          AND Torolve = 0
        ORDER BY
          CASE WHEN Olvasva = 0 THEN 0 ELSE 1 END,
          Letrehozva DESC,
          FelhasznaloErtesitesId DESC
      `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Felhasználói értesítések lekérési hiba:", error);
    return res.status(500).json({
      message: "Hiba az értesítések lekérésekor.",
    });
  }
}

async function getNotificationDetail(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);
    const notificationId = Number.parseInt(req.params.notificationId, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ message: "Bejelentkezés szükséges." });
    }

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ message: "Érvénytelen értesítés azonosító." });
    }

    const pool = await poolPromise;
    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("notificationId", sql.Int, notificationId)
      .query(`
        UPDATE FelhasznaloErtesites
        SET Olvasva = 1
        WHERE FelhasznaloErtesitesId = @notificationId
          AND CimzettFelhasznaloId = @userId
          AND Torolve = 0
      `);

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("notificationId", sql.Int, notificationId)
      .query(`
        SELECT
          FelhasznaloErtesitesId,
          Tipus,
          Cim,
          Szoveg,
          HivatkozasUrl,
          Letrehozva,
          Olvasva
        FROM FelhasznaloErtesites
        WHERE FelhasznaloErtesitesId = @notificationId
          AND CimzettFelhasznaloId = @userId
          AND Torolve = 0
      `);

    const notification = result.recordset[0];

    if (!notification) {
      return res.status(404).json({ message: "Az értesítés nem található." });
    }

    return res.status(200).json(notification);
  } catch (error) {
    console.error("Felhasználói értesítés részlet hiba:", error);
    return res.status(500).json({
      message: "Hiba az értesítés megnyitása közben.",
    });
  }
}

async function deleteNotification(req, res) {
  try {
    const userId = Number.parseInt(req.user?.id, 10);
    const notificationId = Number.parseInt(req.params.notificationId, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ message: "Bejelentkezés szükséges." });
    }

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ message: "Érvénytelen értesítés azonosító." });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("notificationId", sql.Int, notificationId)
      .query(`
        UPDATE FelhasznaloErtesites
        SET Torolve = 1
        OUTPUT INSERTED.FelhasznaloErtesitesId
        WHERE FelhasznaloErtesitesId = @notificationId
          AND CimzettFelhasznaloId = @userId
          AND Torolve = 0
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "Az értesítés nem található." });
    }

    return res.status(200).json({
      message: "Az értesítés sikeresen törölve.",
    });
  } catch (error) {
    console.error("Felhasználói értesítés törlési hiba:", error);
    return res.status(500).json({
      message: "Hiba az értesítés törlése közben.",
    });
  }
}

module.exports = {
  createUserNotification,
  getNotifications,
  getNotificationDetail,
  deleteNotification,
};
