const { sql, poolPromise } = require("../DbConfig");

const deleteProfile = async (req, res) => {
  try {
    const userId = req.body?.userId || req.query?.userId || req.user?.id;
    const isAdmin = Boolean(req.user?.admin);

    if (!userId) {
      return res.status(401).json({
        message: "Bejelentkezés szükséges.",
      });
    }

    if (isAdmin) {
      return res.status(403).json({
        message: "Adminisztrátori fiók nem törölhető innen.",
      });
    }

    const pool = await poolPromise;
    const userResult = await pool
      .request()
      .input("userId", sql.Int, parseInt(userId, 10))
      .query(`
        SELECT FelhasznaloId, Felhasznalonev
        FROM Felhasznalo
        WHERE FelhasznaloId = @userId
      `);

    const user = userResult.recordset[0];

    if (!user) {
      return res.status(404).json({
        message: "Felhasználó nem található.",
      });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input("userId", sql.Int, parseInt(userId, 10))
        .query(`
          DELETE FROM BaratKerelem
          WHERE KezdemenyezoFelhasznaloId = @userId
             OR CimzettFelhasznaloId = @userId;

          DELETE FROM BaratUzenet
          WHERE KuldoFelhasznaloId = @userId
             OR CimzettFelhasznaloId = @userId;

          DELETE FROM ForumHozzaszolas
          WHERE FelhasznaloId = @userId;

          DELETE FROM ForumTema
          WHERE FelhasznaloId = @userId;

          DELETE FROM ForumReport
          WHERE FelhasznaloId = @userId;

          DELETE FROM MarketplaceHirdetes
          WHERE FelhasznaloId = @userId;

          DELETE FROM FogasNaplo
          WHERE FelhasznaloId = @userId;

          DELETE FROM HorgaszNap
          WHERE FelhasznaloId = @userId;

          DELETE FROM Felhasznalo
          WHERE FelhasznaloId = @userId;
        `);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return res.status(200).json({
      message: "Profil sikeresen törölve.",
      deletedUser: {
        id: user.FelhasznaloId,
        username: user.Felhasznalonev,
      },
    });
  } catch (error) {
    console.error("Profiltörlési hiba:", error);
    return res.status(500).json({
      message: "Hiba a profil törlésekor.",
    });
  }
};

module.exports = {
  deleteProfile,
};


