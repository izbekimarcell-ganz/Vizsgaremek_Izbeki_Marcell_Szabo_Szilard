const { sql, poolPromise } = require("../DbConfig");

// Összes téma lekérése
const getTemak = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        ft.TemaId,
        ft.Cim,
        ft.Letrehozva,
        ft.FelhasznaloId,
        f.Felhasznalonev,
        (SELECT COUNT(*) FROM dbo.ForumHozzaszolas WHERE TemaId = ft.TemaId) AS HozzaszolasokSzama
      FROM dbo.ForumTema ft
      INNER JOIN dbo.Felhasznalo f ON ft.FelhasznaloId = f.FelhasznaloId
      ORDER BY ft.Letrehozva DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Forum tema lekeres hiba:", err);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

// Új téma létrehozása
const createTema = async (req, res) => {
  try {
    const { cim } = req.body;
    const felhasznaloId = req.user.id;

    if (!cim || cim.trim().length === 0) {
      return res.status(400).json({
        message: "A tema cime kotelezo.",
      });
    }

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("felhasznaloId", sql.Int, felhasznaloId)
      .input("cim", sql.NVarChar(150), cim.trim())
      .query(`
        INSERT INTO dbo.ForumTema (FelhasznaloId, Cim)
        OUTPUT
          INSERTED.TemaId,
          INSERTED.FelhasznaloId,
          INSERTED.Cim,
          INSERTED.Letrehozva
        VALUES (@felhasznaloId, @cim)
      `);

    return res.status(201).json({
      message: "Tema sikeresen letrehozva.",
      tema: result.recordset[0],
    });
  } catch (error) {
    console.error("Tema letrehozas hiba:", error);
    return res.status(500).json({
      message: "Szerverhiba tortent.",
    });
  }
};

// Téma hozzászólásainak lekérése
const getHozzaszolasok = async (req, res) => {
  try {
    const { temaId } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("temaId", sql.Int, parseInt(temaId))
      .query(`
        SELECT
          fh.HozzaszolasId,
          fh.TemaId,
          fh.FelhasznaloId,
          f.Felhasznalonev,
          fh.Szoveg,
          fh.KepUrl,
          fh.Letrehozva
        FROM dbo.ForumHozzaszolas fh
        INNER JOIN dbo.Felhasznalo f ON fh.FelhasznaloId = f.FelhasznaloId
        WHERE fh.TemaId = @temaId
        ORDER BY fh.Letrehozva ASC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Hozzaszolasok lekeres hiba:", error);
    res.status(500).json({ message: "Szerver hiba." });
  }
};

// Új hozzászólás létrehozása
const createHozzaszolas = async (req, res) => {
  try {
    const { temaId, szoveg, kepUrl } = req.body;
    const felhasznaloId = req.user.id;

    if (!temaId || !szoveg || szoveg.trim().length === 0) {
      return res.status(400).json({
        message: "A temaId es a szoveg kotelezo.",
      });
    }

    const pool = await poolPromise;

    // Ellenőrizzük, hogy létezik-e a téma
    const temaCheck = await pool
      .request()
      .input("temaId", sql.Int, parseInt(temaId))
      .query(`SELECT TemaId FROM dbo.ForumTema WHERE TemaId = @temaId`);

    if (temaCheck.recordset.length === 0) {
      return res.status(404).json({
        message: "A megadott tema nem letezik.",
      });
    }

    const result = await pool
      .request()
      .input("temaId", sql.Int, parseInt(temaId))
      .input("felhasznaloId", sql.Int, felhasznaloId)
      .input("szoveg", sql.NVarChar(sql.MAX), szoveg.trim())
      .input("kepUrl", sql.NVarChar(300), kepUrl || null)
      .query(`
        INSERT INTO dbo.ForumHozzaszolas (TemaId, FelhasznaloId, Szoveg, KepUrl)
        OUTPUT
          INSERTED.HozzaszolasId,
          INSERTED.TemaId,
          INSERTED.FelhasznaloId,
          INSERTED.Szoveg,
          INSERTED.KepUrl,
          INSERTED.Letrehozva
        VALUES (@temaId, @felhasznaloId, @szoveg, @kepUrl)
      `);

    return res.status(201).json({
      message: "Hozzaszolas sikeresen letrehozva.",
      hozzaszolas: result.recordset[0],
    });
  } catch (error) {
    console.error("Hozzaszolas letrehozas hiba:", error);
    return res.status(500).json({
      message: "Szerverhiba tortent.",
    });
  }
};

// Téma törlése (admin)
const deleteTema = async (req, res) => {
  try {
    const { temaId } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("temaId", sql.Int, parseInt(temaId))
      .query(`DELETE FROM dbo.ForumTema WHERE TemaId = @temaId`);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        message: "A tema nem talalhato.",
      });
    }

    return res.json({
      message: "Tema sikeresen torolve.",
    });
  } catch (error) {
    console.error("Tema torles hiba:", error);
    return res.status(500).json({
      message: "Szerverhiba tortent.",
    });
  }
};

// Hozzászólás törlése (admin)
const deleteHozzaszolas = async (req, res) => {
  try {
    const { hozzaszolasId } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("hozzaszolasId", sql.Int, parseInt(hozzaszolasId))
      .query(`DELETE FROM dbo.ForumHozzaszolas WHERE HozzaszolasId = @hozzaszolasId`);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        message: "A hozzaszolas nem talalhato.",
      });
    }

    return res.json({
      message: "Hozzaszolas sikeresen torolve.",
    });
  } catch (error) {
    console.error("Hozzaszolas torles hiba:", error);
    return res.status(500).json({
      message: "Szerverhiba tortent.",
    });
  }
};

module.exports = {
  getTemak,
  createTema,
  getHozzaszolasok,
  createHozzaszolas,
  deleteTema,
  deleteHozzaszolas,
};