const { sql, poolPromise } = require("../DbConfig");

async function getProfileVisibility(userId, viewer = null) {
  const parsedUserId = Number.parseInt(userId, 10);

  if (Number.isNaN(parsedUserId)) {
    return null;
  }

  const viewerId = Number.isInteger(Number(viewer?.id)) ? Number(viewer.id) : null;
  const isAdminViewer = Boolean(viewer?.admin);
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("userId", sql.Int, parsedUserId)
    .input("viewerId", sql.Int, viewerId)
    .input("isAdminViewer", sql.Bit, isAdminViewer)
    .query(`
      SELECT
        u.FelhasznaloId,
        u.Felhasznalonev,
        u.Email,
        u.Admin,
        u.Aktiv,
        u.Letrehozva,
        u.Privat,
        CASE
          WHEN @viewerId IS NOT NULL AND @viewerId = u.FelhasznaloId THEN 1
          ELSE 0
        END AS IsSelf,
        CASE
          WHEN @viewerId IS NOT NULL AND EXISTS (
            SELECT 1
            FROM BaratKerelem bk
            WHERE bk.Allapot = N'accepted'
              AND (
                (bk.KezdemenyezoFelhasznaloId = @viewerId AND bk.CimzettFelhasznaloId = u.FelhasznaloId)
                OR
                (bk.CimzettFelhasznaloId = @viewerId AND bk.KezdemenyezoFelhasznaloId = u.FelhasznaloId)
              )
          ) THEN 1
          ELSE 0
        END AS IsFriend
      FROM Felhasznalo u
      WHERE u.FelhasznaloId = @userId
        AND u.Admin = 0
        AND (@isAdminViewer = 1 OR u.Aktiv = 1)
    `);

  const user = result.recordset[0];

  if (!user) {
    return null;
  }

  const isSelf = Boolean(user.IsSelf);
  const isFriend = Boolean(user.IsFriend);
  const isPrivate = Boolean(user.Privat);
  const canView = isAdminViewer || isSelf || isFriend || !isPrivate;

  return {
    user,
    isSelf,
    isFriend,
    isPrivate,
    canView,
  };
}

module.exports = {
  getProfileVisibility,
};
