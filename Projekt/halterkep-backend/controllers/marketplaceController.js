const { sql, poolPromise } = require("../DbConfig");
const { createUserNotification } = require("./notificationController");

const ALLOWED_SORTS = new Set(["featured", "price-asc", "price-desc", "newest"]);
const REPORT_REASON_CODES = new Set([
  "spam",
  "offensive",
  "harassment",
  "misleading",
  "off_topic",
  "other",
]);
const MAX_MARKETPLACE_IMAGES = 5;

function normalizeText(value, maxLength = 0) {
  const normalized = String(value || "").trim();
  return maxLength > 0 ? normalized.slice(0, maxLength) : normalized;
}

function normalizeSort(value) {
  const sort = normalizeText(value, 20).toLowerCase();
  return ALLOWED_SORTS.has(sort) ? sort : "featured";
}

function getAuthenticatedUserId(req) {
  const userId = Number.parseInt(req.user?.id, 10);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function buildMarketplaceJumpUrl(listingId) {
  return `marketplace-reszlet.html?id=${listingId}`;
}

async function fetchMarketplaceListingTarget(pool, listingId) {
  const result = await pool
    .request()
    .input("listingId", sql.Int, listingId)
    .query(`
      SELECT
        mh.MarketplaceHirdetesId,
        mh.FelhasznaloId AS HirdetoFelhasznaloId,
        mh.Cim,
        mh.Leiras,
        mh.ArFt,
        mh.Telepules,
        mh.Jegelve,
        mk.Kod AS KategoriaKod,
        mk.Nev AS KategoriaNev,
        f.Felhasznalonev AS HirdetoFelhasznalonev
      FROM MarketplaceHirdetes mh
      INNER JOIN MarketplaceKategoria mk
        ON mk.MarketplaceKategoriaId = mh.MarketplaceKategoriaId
      INNER JOIN Felhasznalo f
        ON f.FelhasznaloId = mh.FelhasznaloId
      WHERE mh.MarketplaceHirdetesId = @listingId
        AND mh.Aktiv = 1
        AND mk.Aktiv = 1
        AND f.Aktiv = 1
    `);

  return result.recordset[0] || null;
}

async function getMarketplaceConversationContext(pool, userId, messageId) {
  const result = await pool
    .request()
    .input("messageId", sql.Int, messageId)
    .input("userId", sql.Int, userId)
    .query(`
      SELECT TOP (1)
        mu.MarketplaceUzenetId,
        mu.MarketplaceHirdetesId,
        mh.Cim AS HirdetesCim,
        CASE
          WHEN mu.KuldoFelhasznaloId = @userId THEN mu.CimzettFelhasznaloId
          ELSE mu.KuldoFelhasznaloId
        END AS MasikFelhasznaloId,
        masik.Felhasznalonev AS MasikFelhasznalonev
      FROM MarketplaceUzenet mu
      INNER JOIN MarketplaceHirdetes mh
        ON mh.MarketplaceHirdetesId = mu.MarketplaceHirdetesId
      INNER JOIN Felhasznalo masik
        ON masik.FelhasznaloId = CASE
          WHEN mu.KuldoFelhasznaloId = @userId THEN mu.CimzettFelhasznaloId
          ELSE mu.KuldoFelhasznaloId
        END
      WHERE mu.MarketplaceUzenetId = @messageId
        AND (
          (mu.KuldoFelhasznaloId = @userId AND mu.KuldoTorolve = 0)
          OR (mu.CimzettFelhasznaloId = @userId AND mu.CimzettTorolve = 0)
        )
    `);

  return result.recordset[0] || null;
}

function normalizeMarketplaceImages(rawImages) {
  const normalizedImages = (Array.isArray(rawImages) ? rawImages : [])
    .slice(0, MAX_MARKETPLACE_IMAGES)
    .map((image, index) => ({
      KepUrl: normalizeText(image?.kepUrl),
      FoKep: Boolean(image?.foKep),
      Sorrend: Number.isInteger(Number(image?.sorrend)) ? Number(image.sorrend) : index,
    }))
    .filter((image) => image.KepUrl);

  if (normalizedImages.some((image) => !image.KepUrl.startsWith("data:image/"))) {
    return {
      error: "Csak ervenyes kepfajlok tolthetok fel.",
      images: [],
    };
  }

  const primaryIndex = normalizedImages.findIndex((image) => image.FoKep);
  const orderedImages = normalizedImages.map((image) => ({ ...image }));

  if (primaryIndex > 0) {
    const [primaryImage] = orderedImages.splice(primaryIndex, 1);
    orderedImages.unshift(primaryImage);
  }

  return {
    images: orderedImages.map((image, index) => ({
      KepUrl: image.KepUrl,
      FoKep: index === 0,
      Sorrend: index,
    })),
  };
}

async function insertMarketplaceImages(transaction, listingId, images) {
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    await new sql.Request(transaction)
      .input("marketplaceHirdetesId", sql.Int, listingId)
      .input("kepUrl", sql.NVarChar(sql.MAX), image.KepUrl)
      .input("foKep", sql.Bit, Number(Boolean(image.FoKep)))
      .input("sorrend", sql.Int, Number.isInteger(image.Sorrend) ? image.Sorrend : index)
      .query(`
        INSERT INTO MarketplaceHirdetesKep
          (
            MarketplaceHirdetesId,
            KepUrl,
            FoKep,
            Sorrend
          )
        VALUES
          (
            @marketplaceHirdetesId,
            @kepUrl,
            @foKep,
            @sorrend
          )
      `);
  }
}

async function getMarketplaceCategories(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        mk.MarketplaceKategoriaId,
        mk.Kod,
        mk.Nev,
        mk.Sorrend,
        COUNT(mh.MarketplaceHirdetesId) AS HirdetesDb
      FROM MarketplaceKategoria mk
      LEFT JOIN MarketplaceHirdetes mh
        ON mh.MarketplaceKategoriaId = mk.MarketplaceKategoriaId
       AND mh.Aktiv = 1
      WHERE mk.Aktiv = 1
      GROUP BY mk.MarketplaceKategoriaId, mk.Kod, mk.Nev, mk.Sorrend
      ORDER BY mk.Sorrend ASC, mk.Nev ASC
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Marketplace kategoriak lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a marketplace kategoriak lekeresekor.",
    });
  }
}

async function getMarketplaceListings(req, res) {
  try {
    const categoryCode = normalizeText(req.query?.category, 30).toLowerCase();
    const searchTerm = normalizeText(req.query?.q, 120);
    const sort = normalizeSort(req.query?.sort);

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("categoryCode", sql.NVarChar(30), categoryCode)
      .input("searchTerm", sql.NVarChar(120), searchTerm)
      .input("sort", sql.NVarChar(20), sort)
      .query(`
        SELECT
          mh.MarketplaceHirdetesId,
          mh.FelhasznaloId,
          mh.MarketplaceKategoriaId,
          mh.Cim,
          mh.Leiras,
          mh.ArFt,
          mh.Telepules,
          mh.Jegelve,
          mh.Kiemelt,
          mh.Letrehozva,
          foto.KepUrl AS FoKepUrl,
          mk.Kod AS KategoriaKod,
          mk.Nev AS KategoriaNev,
          f.Felhasznalonev
        FROM MarketplaceHirdetes mh
        INNER JOIN MarketplaceKategoria mk
          ON mk.MarketplaceKategoriaId = mh.MarketplaceKategoriaId
        INNER JOIN Felhasznalo f
          ON f.FelhasznaloId = mh.FelhasznaloId
        OUTER APPLY
        (
          SELECT TOP (1)
            hk.KepUrl
          FROM MarketplaceHirdetesKep hk
          WHERE hk.MarketplaceHirdetesId = mh.MarketplaceHirdetesId
          ORDER BY
            CASE WHEN hk.FoKep = 1 THEN 0 ELSE 1 END,
            hk.Sorrend ASC,
            hk.MarketplaceHirdetesKepId ASC
        ) foto
        WHERE mh.Aktiv = 1
          AND mk.Aktiv = 1
          AND f.Aktiv = 1
          AND (@categoryCode = N'' OR mk.Kod = @categoryCode)
          AND (
            @searchTerm = N''
            OR mh.Cim LIKE N'%' + @searchTerm + N'%'
            OR mh.Leiras LIKE N'%' + @searchTerm + N'%'
            OR mh.Telepules LIKE N'%' + @searchTerm + N'%'
          )
        ORDER BY
          CASE
            WHEN @sort = N'featured' AND mh.Kiemelt = 1 THEN 0
            WHEN @sort = N'featured' THEN 1
            ELSE 0
          END,
          CASE WHEN @sort = N'price-asc' THEN mh.ArFt END ASC,
          CASE WHEN @sort = N'price-desc' THEN mh.ArFt END DESC,
          mh.Letrehozva DESC,
          mh.MarketplaceHirdetesId DESC
      `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Marketplace hirdetesek lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a marketplace hirdetesek lekeresekor.",
    });
  }
}

async function getMarketplaceListingById(req, res) {
  try {
    const listingId = Number.parseInt(req.params?.id, 10);

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ message: "Ervenytelen hirdetes azonosito." });
    }

    const pool = await poolPromise;
    const listingResult = await pool
      .request()
      .input("listingId", sql.Int, listingId)
      .query(`
        SELECT
          mh.MarketplaceHirdetesId,
          mh.FelhasznaloId,
          mh.MarketplaceKategoriaId,
          mh.Cim,
          mh.Leiras,
          mh.ArFt,
          mh.Telepules,
          mh.Jegelve,
          mh.Kiemelt,
          mh.Letrehozva,
          foto.KepUrl AS FoKepUrl,
          mk.Kod AS KategoriaKod,
          mk.Nev AS KategoriaNev,
          f.Felhasznalonev
        FROM MarketplaceHirdetes mh
        INNER JOIN MarketplaceKategoria mk
          ON mk.MarketplaceKategoriaId = mh.MarketplaceKategoriaId
        INNER JOIN Felhasznalo f
          ON f.FelhasznaloId = mh.FelhasznaloId
        OUTER APPLY
        (
          SELECT TOP (1)
            hk.KepUrl
          FROM MarketplaceHirdetesKep hk
          WHERE hk.MarketplaceHirdetesId = mh.MarketplaceHirdetesId
          ORDER BY
            CASE WHEN hk.FoKep = 1 THEN 0 ELSE 1 END,
            hk.Sorrend ASC,
            hk.MarketplaceHirdetesKepId ASC
        ) foto
        WHERE mh.MarketplaceHirdetesId = @listingId
          AND mh.Aktiv = 1
          AND mk.Aktiv = 1
          AND f.Aktiv = 1
      `);

    const listing = listingResult.recordset[0];

    if (!listing) {
      return res.status(404).json({ message: "A keresett hirdetes nem talalhato." });
    }

    const imagesResult = await pool
      .request()
      .input("listingId", sql.Int, listingId)
      .query(`
        SELECT
          MarketplaceHirdetesKepId,
          KepUrl,
          FoKep,
          Sorrend
        FROM MarketplaceHirdetesKep
        WHERE MarketplaceHirdetesId = @listingId
        ORDER BY
          CASE WHEN FoKep = 1 THEN 0 ELSE 1 END,
          Sorrend ASC,
          MarketplaceHirdetesKepId ASC
      `);

    return res.status(200).json({
      ...listing,
      Kepek: imagesResult.recordset,
    });
  } catch (error) {
    console.error("Marketplace hirdetes reszlet lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a marketplace hirdetes reszleteinek lekeresekor.",
    });
  }
}

async function createMarketplaceListing(req, res) {
  let transaction;

  try {
    const userId = getAuthenticatedUserId(req);
    const categoryId = Number.parseInt(req.body?.marketplaceKategoriaId, 10);
    const title = normalizeText(req.body?.cim, 150);
    const description = normalizeText(req.body?.leiras, 2000);
    const city = normalizeText(req.body?.telepules, 100);
    const price = Number.parseInt(req.body?.arFt, 10);
    const rawImages = Array.isArray(req.body?.kepek) ? req.body.kepek.slice(0, MAX_MARKETPLACE_IMAGES) : [];

    if (!userId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({ message: "Valassz ervenyes kategoriat." });
    }

    if (!title || title.length < 3) {
      return res.status(400).json({ message: "A cim legalabb 3 karakter legyen." });
    }

    if (!description) {
      return res.status(400).json({ message: "A leiras megadasa kotelezo." });
    }

    if (!city || city.length < 2) {
      return res.status(400).json({ message: "Add meg a telepules nevet." });
    }

    if (!Number.isInteger(price) || price < 0) {
      return res.status(400).json({ message: "Adj meg ervenyes arat." });
    }

    const { images: normalizedImages, error: imageValidationError } = normalizeMarketplaceImages(rawImages);

    if (normalizedImages.length > MAX_MARKETPLACE_IMAGES) {
      return res.status(400).json({
        message: `Legfeljebb ${MAX_MARKETPLACE_IMAGES} kep toltheto fel.`,
      });
    }

    if (imageValidationError) {
      return res.status(400).json({
        message: imageValidationError,
      });
    }

    const pool = await poolPromise;
    const categoryResult = await pool
      .request()
      .input("categoryId", sql.Int, categoryId)
      .query(`
        SELECT MarketplaceKategoriaId
        FROM MarketplaceKategoria
        WHERE MarketplaceKategoriaId = @categoryId
          AND Aktiv = 1
      `);

    if (!categoryResult.recordset.length) {
      return res.status(404).json({ message: "A valasztott kategoria nem talalhato." });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const insertListingResult = await new sql.Request(transaction)
      .input("felhasznaloId", sql.Int, userId)
      .input("marketplaceKategoriaId", sql.Int, categoryId)
      .input("cim", sql.NVarChar(150), title)
      .input("leiras", sql.NVarChar(2000), description)
      .input("arFt", sql.Int, price)
      .input("telepules", sql.NVarChar(100), city)
      .query(`
        INSERT INTO MarketplaceHirdetes
          (
            FelhasznaloId,
            MarketplaceKategoriaId,
            Cim,
            Leiras,
            ArFt,
            Telepules
          )
        OUTPUT INSERTED.MarketplaceHirdetesId
        VALUES
          (
            @felhasznaloId,
            @marketplaceKategoriaId,
            @cim,
            @leiras,
            @arFt,
            @telepules
          )
      `);

    const listingId = insertListingResult.recordset[0]?.MarketplaceHirdetesId;

    await insertMarketplaceImages(transaction, listingId, normalizedImages);

    await transaction.commit();

    return res.status(201).json({
      message: "A hirdetes sikeresen letrehozva.",
      MarketplaceHirdetesId: listingId,
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Marketplace hirdetes rollback hiba:", rollbackError);
      }
    }

    console.error("Marketplace hirdetes letrehozasi hiba:", error);
    return res.status(500).json({
      message: "Hiba a hirdetes letrehozasa kozben.",
    });
  }
}

async function updateMarketplaceListing(req, res) {
  let transaction;

  try {
    const userId = getAuthenticatedUserId(req);
    const listingId = Number.parseInt(req.params?.id, 10);
    const categoryId = Number.parseInt(req.body?.marketplaceKategoriaId, 10);
    const title = normalizeText(req.body?.cim, 150);
    const description = normalizeText(req.body?.leiras, 2000);
    const city = normalizeText(req.body?.telepules, 100);
    const price = Number.parseInt(req.body?.arFt, 10);
    const rawImages = Array.isArray(req.body?.kepek) ? req.body.kepek.slice(0, MAX_MARKETPLACE_IMAGES) : [];

    if (!userId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ message: "Ervenytelen hirdetes azonosito." });
    }

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({ message: "Valassz ervenyes kategoriat." });
    }

    if (!title || title.length < 3) {
      return res.status(400).json({ message: "A cim legalabb 3 karakter legyen." });
    }

    if (!description) {
      return res.status(400).json({ message: "A leiras megadasa kotelezo." });
    }

    if (!city || city.length < 2) {
      return res.status(400).json({ message: "Add meg a telepules nevet." });
    }

    if (!Number.isInteger(price) || price < 0) {
      return res.status(400).json({ message: "Adj meg ervenyes arat." });
    }

    const { images: normalizedImages, error: imageValidationError } = normalizeMarketplaceImages(rawImages);

    if (normalizedImages.length > MAX_MARKETPLACE_IMAGES) {
      return res.status(400).json({
        message: `Legfeljebb ${MAX_MARKETPLACE_IMAGES} kep toltheto fel.`,
      });
    }

    if (imageValidationError) {
      return res.status(400).json({
        message: imageValidationError,
      });
    }

    const pool = await poolPromise;
    const listingResult = await pool
      .request()
      .input("listingId", sql.Int, listingId)
      .input("userId", sql.Int, userId)
      .query(`
        SELECT MarketplaceHirdetesId
        FROM MarketplaceHirdetes
        WHERE MarketplaceHirdetesId = @listingId
          AND FelhasznaloId = @userId
          AND Aktiv = 1
      `);

    const listing = listingResult.recordset[0];

    if (!listing) {
      return res.status(404).json({ message: "A hirdetes nem talalhato." });
    }

    const categoryResult = await pool
      .request()
      .input("categoryId", sql.Int, categoryId)
      .query(`
        SELECT MarketplaceKategoriaId
        FROM MarketplaceKategoria
        WHERE MarketplaceKategoriaId = @categoryId
          AND Aktiv = 1
      `);

    if (!categoryResult.recordset.length) {
      return res.status(404).json({ message: "A valasztott kategoria nem talalhato." });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    await new sql.Request(transaction)
      .input("listingId", sql.Int, listingId)
      .input("userId", sql.Int, userId)
      .input("marketplaceKategoriaId", sql.Int, categoryId)
      .input("cim", sql.NVarChar(150), title)
      .input("leiras", sql.NVarChar(2000), description)
      .input("arFt", sql.Int, price)
      .input("telepules", sql.NVarChar(100), city)
      .query(`
        UPDATE MarketplaceHirdetes
        SET
          MarketplaceKategoriaId = @marketplaceKategoriaId,
          Cim = @cim,
          Leiras = @leiras,
          ArFt = @arFt,
          Telepules = @telepules
        WHERE MarketplaceHirdetesId = @listingId
          AND FelhasznaloId = @userId
          AND Aktiv = 1
      `);

    await new sql.Request(transaction)
      .input("listingId", sql.Int, listingId)
      .query(`
        DELETE FROM MarketplaceHirdetesKep
        WHERE MarketplaceHirdetesId = @listingId
      `);

    await insertMarketplaceImages(transaction, listingId, normalizedImages);

    await transaction.commit();

    return res.status(200).json({
      message: "A hirdetes sikeresen frissitve.",
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Marketplace hirdetes update rollback hiba:", rollbackError);
      }
    }

    console.error("Marketplace hirdetes frissitesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a hirdetes frissitese kozben.",
    });
  }
}

async function setMarketplaceListingFrozenState(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const listingId = Number.parseInt(req.params?.id, 10);
    const frozen = Boolean(req.body?.frozen);

    if (!userId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ message: "Ervenytelen hirdetes azonosito." });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("listingId", sql.Int, listingId)
      .input("userId", sql.Int, userId)
      .input("jegelve", sql.Bit, Number(frozen))
      .query(`
        UPDATE MarketplaceHirdetes
        SET Jegelve = @jegelve
        OUTPUT INSERTED.MarketplaceHirdetesId, INSERTED.Jegelve
        WHERE MarketplaceHirdetesId = @listingId
          AND FelhasznaloId = @userId
          AND Aktiv = 1
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "A hirdetes nem talalhato." });
    }

    return res.status(200).json({
      message: frozen ? "A hirdetes jegelve lett." : "A hirdetes jegelese megszunt.",
      Jegelve: Boolean(result.recordset[0].Jegelve),
    });
  } catch (error) {
    console.error("Marketplace hirdetes jegelesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a hirdetes allapotanak modositasakor.",
    });
  }
}

async function deleteMarketplaceListing(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const listingId = Number.parseInt(req.params?.id, 10);

    if (!userId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ message: "Ervenytelen hirdetes azonosito." });
    }

    const pool = await poolPromise;
    const listingResult = await pool
      .request()
      .input("listingId", sql.Int, listingId)
      .input("userId", sql.Int, userId)
      .query(`
        SELECT MarketplaceHirdetesId, Jegelve
        FROM MarketplaceHirdetes
        WHERE MarketplaceHirdetesId = @listingId
          AND FelhasznaloId = @userId
          AND Aktiv = 1
      `);

    const listing = listingResult.recordset[0];

    if (!listing) {
      return res.status(404).json({ message: "A hirdetes nem talalhato." });
    }

    if (!listing.Jegelve) {
      return res.status(400).json({
        message: "Hirdetest csak jegelt allapotban lehet torolni.",
      });
    }

    await pool
      .request()
      .input("listingId", sql.Int, listingId)
      .input("userId", sql.Int, userId)
      .query(`
        UPDATE MarketplaceHirdetes
        SET Aktiv = 0
        WHERE MarketplaceHirdetesId = @listingId
          AND FelhasznaloId = @userId
          AND Aktiv = 1
      `);

    return res.status(200).json({
      message: "A hirdetes sikeresen torolve.",
    });
  } catch (error) {
    console.error("Marketplace hirdetes torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a hirdetes torlese kozben.",
    });
  }
}

async function getMarketplaceListingsForAdmin(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        mh.MarketplaceHirdetesId,
        mh.FelhasznaloId,
        mh.Cim,
        mh.Leiras,
        mh.ArFt,
        mh.Telepules,
        mh.Jegelve,
        mh.Kiemelt,
        mh.Letrehozva,
        foto.KepUrl AS FoKepUrl,
        mk.Kod AS KategoriaKod,
        mk.Nev AS KategoriaNev,
        f.Felhasznalonev,
        SUM(CASE WHEN mr.AdminTorolve = 0 THEN 1 ELSE 0 END) AS AktivReportDb
      FROM MarketplaceHirdetes mh
      INNER JOIN MarketplaceKategoria mk
        ON mk.MarketplaceKategoriaId = mh.MarketplaceKategoriaId
      INNER JOIN Felhasznalo f
        ON f.FelhasznaloId = mh.FelhasznaloId
      OUTER APPLY
      (
        SELECT TOP (1)
          hk.KepUrl
        FROM MarketplaceHirdetesKep hk
        WHERE hk.MarketplaceHirdetesId = mh.MarketplaceHirdetesId
        ORDER BY
          CASE WHEN hk.FoKep = 1 THEN 0 ELSE 1 END,
          hk.Sorrend ASC,
          hk.MarketplaceHirdetesKepId ASC
      ) foto
      LEFT JOIN MarketplaceReport mr
        ON mr.MarketplaceHirdetesId = mh.MarketplaceHirdetesId
      WHERE mh.Aktiv = 1
      GROUP BY
        mh.MarketplaceHirdetesId,
        mh.FelhasznaloId,
        mh.Cim,
        mh.Leiras,
        mh.ArFt,
        mh.Telepules,
        mh.Jegelve,
        mh.Kiemelt,
        mh.Letrehozva,
        foto.KepUrl,
        mk.Kod,
        mk.Nev,
        f.Felhasznalonev
      ORDER BY
        mh.Jegelve ASC,
        mh.Letrehozva DESC,
        mh.MarketplaceHirdetesId DESC
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Marketplace admin hirdetesek lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba a marketplace hirdetesek admin lekeresekor.",
    });
  }
}

async function getMarketplaceListingDetailForAdmin(req, res) {
  try {
    const listingId = Number.parseInt(req.params?.id, 10);

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ message: "Ervenytelen hirdetes azonosito." });
    }

    const pool = await poolPromise;
    const listingResult = await pool
      .request()
      .input("listingId", sql.Int, listingId)
      .query(`
        SELECT
          mh.MarketplaceHirdetesId,
          mh.FelhasznaloId,
          mh.MarketplaceKategoriaId,
          mh.Cim,
          mh.Leiras,
          mh.ArFt,
          mh.Telepules,
          mh.Jegelve,
          mh.Kiemelt,
          mh.Letrehozva,
          mk.Kod AS KategoriaKod,
          mk.Nev AS KategoriaNev,
          f.Felhasznalonev,
          SUM(CASE WHEN mr.AdminTorolve = 0 THEN 1 ELSE 0 END) AS AktivReportDb
        FROM MarketplaceHirdetes mh
        INNER JOIN MarketplaceKategoria mk
          ON mk.MarketplaceKategoriaId = mh.MarketplaceKategoriaId
        INNER JOIN Felhasznalo f
          ON f.FelhasznaloId = mh.FelhasznaloId
        LEFT JOIN MarketplaceReport mr
          ON mr.MarketplaceHirdetesId = mh.MarketplaceHirdetesId
        WHERE mh.MarketplaceHirdetesId = @listingId
          AND mh.Aktiv = 1
        GROUP BY
          mh.MarketplaceHirdetesId,
          mh.FelhasznaloId,
          mh.MarketplaceKategoriaId,
          mh.Cim,
          mh.Leiras,
          mh.ArFt,
          mh.Telepules,
          mh.Jegelve,
          mh.Kiemelt,
          mh.Letrehozva,
          mk.Kod,
          mk.Nev,
          f.Felhasznalonev
      `);

    const listing = listingResult.recordset[0];

    if (!listing) {
      return res.status(404).json({ message: "A hirdetes nem talalhato." });
    }

    const imagesResult = await pool
      .request()
      .input("listingId", sql.Int, listingId)
      .query(`
        SELECT
          MarketplaceHirdetesKepId,
          KepUrl,
          FoKep,
          Sorrend
        FROM MarketplaceHirdetesKep
        WHERE MarketplaceHirdetesId = @listingId
        ORDER BY
          CASE WHEN FoKep = 1 THEN 0 ELSE 1 END,
          Sorrend ASC,
          MarketplaceHirdetesKepId ASC
      `);

    return res.status(200).json({
      ...listing,
      Kepek: imagesResult.recordset,
      UgrasUrl: buildMarketplaceJumpUrl(listingId),
    });
  } catch (error) {
    console.error("Marketplace admin hirdetes reszlet hiba:", error);
    return res.status(500).json({
      message: "Hiba a marketplace hirdetes reszleteinek admin lekeresekor.",
    });
  }
}

async function setMarketplaceListingFrozenStateForAdmin(req, res) {
  try {
    const listingId = Number.parseInt(req.params?.id, 10);
    const frozen = Boolean(req.body?.frozen);

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ message: "Ervenytelen hirdetes azonosito." });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("listingId", sql.Int, listingId)
      .input("jegelve", sql.Bit, Number(frozen))
      .query(`
        UPDATE MarketplaceHirdetes
        SET Jegelve = @jegelve
        OUTPUT INSERTED.MarketplaceHirdetesId, INSERTED.Jegelve
        WHERE MarketplaceHirdetesId = @listingId
          AND Aktiv = 1
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "A hirdetes nem talalhato." });
    }

    return res.status(200).json({
      message: frozen ? "A hirdetes admin altal jegelve lett." : "A hirdetes jegelese megszunt.",
      Jegelve: Boolean(result.recordset[0].Jegelve),
    });
  } catch (error) {
    console.error("Marketplace admin jegelesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a hirdetes admin allapotmodositasa kozben.",
    });
  }
}

async function deleteMarketplaceListingForAdmin(req, res) {
  try {
    const listingId = Number.parseInt(req.params?.id, 10);

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ message: "Ervenytelen hirdetes azonosito." });
    }

    const pool = await poolPromise;
    const listingLookup = await pool
      .request()
      .input("listingId", sql.Int, listingId)
      .query(`
        SELECT
          MarketplaceHirdetesId,
          FelhasznaloId,
          Cim
        FROM MarketplaceHirdetes
        WHERE MarketplaceHirdetesId = @listingId
          AND Aktiv = 1
      `);

    const listing = listingLookup.recordset[0];

    if (!listing) {
      return res.status(404).json({ message: "A hirdetes nem talalhato." });
    }

    const result = await pool
      .request()
      .input("listingId", sql.Int, listingId)
      .query(`
        UPDATE MarketplaceHirdetes
        SET Aktiv = 0
        OUTPUT INSERTED.MarketplaceHirdetesId
        WHERE MarketplaceHirdetesId = @listingId
          AND Aktiv = 1
      `);

    await createUserNotification({
      recipientUserId: Number(listing.FelhasznaloId),
      adminUserId: Number(req.user?.id),
      type: "marketplace-listing-deleted",
      title: "Marketplace hirdetés törölve",
      body: `Az admin törölte a "${String(listing.Cim || "").trim() || "Névtelen hirdetés"}" című hirdetésedet.`,
    });

    return res.status(200).json({
      message: "A hirdetes sikeresen torolve.",
    });
  } catch (error) {
    console.error("Marketplace admin torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a hirdetes admin torlese kozben.",
    });
  }
}

async function createMarketplaceMessage(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const listingId = Number.parseInt(req.params?.id, 10);
    const messageText = normalizeText(req.body?.uzenet, 2000);

    if (!userId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ message: "Ervenytelen hirdetes azonosito." });
    }

    if (!messageText || messageText.length < 3) {
      return res.status(400).json({ message: "Az uzenet legalabb 3 karakter legyen." });
    }

    const pool = await poolPromise;
    const listing = await fetchMarketplaceListingTarget(pool, listingId);

    if (!listing) {
      return res.status(404).json({ message: "A hirdetes nem talalhato." });
    }

    if (Number(listing.HirdetoFelhasznaloId) === userId) {
      return res.status(400).json({ message: "A sajat hirdetesedre nem kuldhetsz uzenetet." });
    }

    await pool
      .request()
      .input("marketplaceHirdetesId", sql.Int, listingId)
      .input("kuldoFelhasznaloId", sql.Int, userId)
      .input("cimzettFelhasznaloId", sql.Int, Number(listing.HirdetoFelhasznaloId))
      .input("uzenetSzoveg", sql.NVarChar(2000), messageText)
      .query(`
        INSERT INTO MarketplaceUzenet
          (
            MarketplaceHirdetesId,
            KuldoFelhasznaloId,
            CimzettFelhasznaloId,
            UzenetSzoveg
          )
        VALUES
          (
            @marketplaceHirdetesId,
            @kuldoFelhasznaloId,
            @cimzettFelhasznaloId,
            @uzenetSzoveg
          )
      `);

    return res.status(201).json({
      message: "Az uzenet sikeresen elkuldve.",
    });
  } catch (error) {
    console.error("Marketplace uzenet kuldesi hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenet kuldese kozben.",
    });
  }
}

async function getMarketplaceMessages(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        WITH UserMessages AS
        (
          SELECT
            mu.MarketplaceUzenetId,
            mu.MarketplaceHirdetesId,
            mu.KuldoFelhasznaloId,
            mu.CimzettFelhasznaloId,
            mu.UzenetSzoveg,
            mu.Letrehozva,
            mu.CimzettOlvasta,
            CASE
              WHEN mu.KuldoFelhasznaloId = @userId THEN mu.CimzettFelhasznaloId
              ELSE mu.KuldoFelhasznaloId
            END AS MasikFelhasznaloId,
            CASE
              WHEN mu.KuldoFelhasznaloId = @userId THEN mu.KuldoTorolve
              ELSE mu.CimzettTorolve
            END AS UserTorolve
          FROM MarketplaceUzenet mu
          WHERE mu.KuldoFelhasznaloId = @userId
             OR mu.CimzettFelhasznaloId = @userId
        ),
        VisibleMessages AS
        (
          SELECT *
          FROM UserMessages
          WHERE UserTorolve = 0
        ),
        Threaded AS
        (
          SELECT
            vm.*,
            ROW_NUMBER() OVER
            (
              PARTITION BY vm.MarketplaceHirdetesId, vm.MasikFelhasznaloId
              ORDER BY vm.Letrehozva DESC, vm.MarketplaceUzenetId DESC
            ) AS RowNum,
            SUM(
              CASE
                WHEN vm.CimzettFelhasznaloId = @userId AND vm.CimzettOlvasta = 0 THEN 1
                ELSE 0
              END
            ) OVER (PARTITION BY vm.MarketplaceHirdetesId, vm.MasikFelhasznaloId) AS OlvasatlanDb
          FROM VisibleMessages vm
        )
        SELECT
          t.MarketplaceUzenetId,
          t.MarketplaceHirdetesId,
          t.MasikFelhasznaloId,
          t.UzenetSzoveg AS UtolsoUzenetSzoveg,
          t.Letrehozva,
          t.OlvasatlanDb,
          mh.Cim AS HirdetesCim,
          masik.Felhasznalonev AS MasikFelhasznalonev,
          CASE WHEN t.KuldoFelhasznaloId = @userId THEN 1 ELSE 0 END AS SajatUtolsoUzenet
        FROM Threaded t
        INNER JOIN MarketplaceHirdetes mh
          ON mh.MarketplaceHirdetesId = t.MarketplaceHirdetesId
        INNER JOIN Felhasznalo masik
          ON masik.FelhasznaloId = t.MasikFelhasznaloId
        WHERE t.RowNum = 1
          AND mh.Aktiv = 1
        ORDER BY
          CASE WHEN t.OlvasatlanDb > 0 THEN 0 ELSE 1 END,
          t.Letrehozva DESC,
          t.MarketplaceUzenetId DESC
      `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Marketplace uzenetek lekeresi hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenetek lekeresekor.",
    });
  }
}

async function getMarketplaceMessageDetail(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const messageId = Number.parseInt(req.params?.messageId, 10);

    if (!userId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({ message: "Ervenytelen uzenet azonosito." });
    }

    const pool = await poolPromise;
    const context = await getMarketplaceConversationContext(pool, userId, messageId);

    if (!context) {
      return res.status(404).json({ message: "Az uzenet nem talalhato." });
    }

    await pool
      .request()
      .input("listingId", sql.Int, Number(context.MarketplaceHirdetesId))
      .input("userId", sql.Int, userId)
      .input("otherUserId", sql.Int, Number(context.MasikFelhasznaloId))
      .query(`
        UPDATE MarketplaceUzenet
        SET CimzettOlvasta = 1
        WHERE MarketplaceHirdetesId = @listingId
          AND KuldoFelhasznaloId = @otherUserId
          AND CimzettFelhasznaloId = @userId
          AND CimzettTorolve = 0
      `);

    const messagesResult = await pool
      .request()
      .input("listingId", sql.Int, Number(context.MarketplaceHirdetesId))
      .input("userId", sql.Int, userId)
      .input("otherUserId", sql.Int, Number(context.MasikFelhasznaloId))
      .query(`
        SELECT
          mu.MarketplaceUzenetId,
          mu.KuldoFelhasznaloId,
          mu.CimzettFelhasznaloId,
          mu.UzenetSzoveg,
          mu.Letrehozva,
          CASE WHEN mu.KuldoFelhasznaloId = @userId THEN 1 ELSE 0 END AS SajatUzenet,
          kuldo.Felhasznalonev AS KuldoFelhasznalonev
        FROM MarketplaceUzenet mu
        INNER JOIN Felhasznalo kuldo
          ON kuldo.FelhasznaloId = mu.KuldoFelhasznaloId
        WHERE mu.MarketplaceHirdetesId = @listingId
          AND (
            (mu.KuldoFelhasznaloId = @userId AND mu.CimzettFelhasznaloId = @otherUserId AND mu.KuldoTorolve = 0)
            OR (mu.KuldoFelhasznaloId = @otherUserId AND mu.CimzettFelhasznaloId = @userId AND mu.CimzettTorolve = 0)
          )
        ORDER BY mu.Letrehozva ASC, mu.MarketplaceUzenetId ASC
      `);

    return res.status(200).json({
      MarketplaceUzenetId: Number(context.MarketplaceUzenetId),
      MarketplaceHirdetesId: Number(context.MarketplaceHirdetesId),
      HirdetesCim: context.HirdetesCim,
      MasikFelhasznaloId: Number(context.MasikFelhasznaloId),
      MasikFelhasznalonev: context.MasikFelhasznalonev || null,
      UgrasUrl: buildMarketplaceJumpUrl(Number(context.MarketplaceHirdetesId)),
      Uzenetek: messagesResult.recordset,
    });
  } catch (error) {
    console.error("Marketplace uzenet reszlet hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenet megnyitasa kozben.",
    });
  }
}

async function replyToMarketplaceMessage(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const messageId = Number.parseInt(req.params?.messageId, 10);
    const messageText = normalizeText(req.body?.uzenet, 2000);

    if (!userId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({ message: "Ervenytelen uzenet azonosito." });
    }

    if (!messageText || messageText.length < 3) {
      return res.status(400).json({ message: "Az uzenet legalabb 3 karakter legyen." });
    }

    const pool = await poolPromise;
    const context = await getMarketplaceConversationContext(pool, userId, messageId);

    if (!context) {
      return res.status(404).json({ message: "Az uzenet nem talalhato." });
    }

    const listing = await fetchMarketplaceListingTarget(pool, Number(context.MarketplaceHirdetesId));

    if (!listing) {
      return res.status(404).json({ message: "A hirdetes nem talalhato." });
    }

    await pool
      .request()
      .input("marketplaceHirdetesId", sql.Int, Number(context.MarketplaceHirdetesId))
      .input("kuldoFelhasznaloId", sql.Int, userId)
      .input("cimzettFelhasznaloId", sql.Int, Number(context.MasikFelhasznaloId))
      .input("uzenetSzoveg", sql.NVarChar(2000), messageText)
      .query(`
        INSERT INTO MarketplaceUzenet
          (
            MarketplaceHirdetesId,
            KuldoFelhasznaloId,
            CimzettFelhasznaloId,
            UzenetSzoveg
          )
        VALUES
          (
            @marketplaceHirdetesId,
            @kuldoFelhasznaloId,
            @cimzettFelhasznaloId,
            @uzenetSzoveg
          )
      `);

    return res.status(201).json({
      message: "Az uzenet sikeresen elkuldve.",
    });
  } catch (error) {
    console.error("Marketplace uzenet valasz kuldesi hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenet kuldese kozben.",
    });
  }
}

async function deleteMarketplaceMessage(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const messageId = Number.parseInt(req.params?.messageId, 10);

    if (!userId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({ message: "Ervenytelen uzenet azonosito." });
    }

    const pool = await poolPromise;
    const context = await getMarketplaceConversationContext(pool, userId, messageId);

    if (!context) {
      return res.status(404).json({ message: "Az uzenet nem talalhato." });
    }

    await pool
      .request()
      .input("listingId", sql.Int, Number(context.MarketplaceHirdetesId))
      .input("userId", sql.Int, userId)
      .input("otherUserId", sql.Int, Number(context.MasikFelhasznaloId))
      .query(`
        UPDATE MarketplaceUzenet
        SET
          KuldoTorolve = CASE WHEN KuldoFelhasznaloId = @userId THEN 1 ELSE KuldoTorolve END,
          CimzettTorolve = CASE WHEN CimzettFelhasznaloId = @userId THEN 1 ELSE CimzettTorolve END
        WHERE MarketplaceHirdetesId = @listingId
          AND (
            (KuldoFelhasznaloId = @userId AND CimzettFelhasznaloId = @otherUserId AND KuldoTorolve = 0)
            OR (KuldoFelhasznaloId = @otherUserId AND CimzettFelhasznaloId = @userId AND CimzettTorolve = 0)
          )
      `);

    return res.status(200).json({
      message: "Az uzenet sikeresen torolve.",
    });
  } catch (error) {
    console.error("Marketplace uzenet torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenet torlese kozben.",
    });
  }
}

async function createMarketplaceReport(req, res) {
  try {
    const reporterUserId = getAuthenticatedUserId(req);
    const listingId = Number.parseInt(req.params?.id, 10);
    const reasonCode = normalizeText(req.body?.reasonCode, 40).toLowerCase();
    const details = normalizeText(req.body?.details, 1000);

    if (!reporterUserId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ message: "Ervenytelen hirdetes azonosito." });
    }

    if (!REPORT_REASON_CODES.has(reasonCode)) {
      return res.status(400).json({ message: "Ervenytelen report indok." });
    }

    if (reasonCode === "other" && details.length < 3) {
      return res.status(400).json({
        message: "Az Egyeb indoknal a reszletezes megadasa kotelezo.",
      });
    }

    const pool = await poolPromise;
    const listing = await fetchMarketplaceListingTarget(pool, listingId);

    if (!listing) {
      return res.status(404).json({ message: "A reportolni kivant hirdetes nem talalhato." });
    }

    if (Number(listing.HirdetoFelhasznaloId) === reporterUserId) {
      return res.status(400).json({ message: "A sajat hirdetesedet nem reportolhatod." });
    }

    await pool
      .request()
      .input("felhasznaloId", sql.Int, reporterUserId)
      .input("marketplaceHirdetesId", sql.Int, listingId)
      .input("hirdetesCim", sql.NVarChar(150), normalizeText(listing.Cim, 150))
      .input("hirdetoFelhasznalonev", sql.NVarChar(50), normalizeText(listing.HirdetoFelhasznalonev, 50))
      .input("indokKod", sql.NVarChar(40), reasonCode)
      .input("reszletezes", sql.NVarChar(1000), details || null)
      .query(`
        INSERT INTO MarketplaceReport
          (
            FelhasznaloId,
            MarketplaceHirdetesId,
            HirdetesCim,
            HirdetoFelhasznalonev,
            IndokKod,
            Reszletezes
          )
        VALUES
          (
            @felhasznaloId,
            @marketplaceHirdetesId,
            @hirdetesCim,
            @hirdetoFelhasznalonev,
            @indokKod,
            @reszletezes
          )
      `);

    return res.status(201).json({
      message: "A report sikeresen elkuldve.",
    });
  } catch (error) {
    console.error("Marketplace report kuldesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a report elkuldese kozben.",
    });
  }
}

async function getAdminMarketplaceReportNotifications(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        MarketplaceReportId,
        Letrehozva
      FROM MarketplaceReport
      WHERE AdminTorolve = 0
        AND AdminOlvasva = 0
      ORDER BY Letrehozva DESC, MarketplaceReportId DESC
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Marketplace admin report ertesites hiba:", error);
    return res.status(500).json({
      message: "Hiba az admin marketplace report ertesitesek lekeresekor.",
    });
  }
}

async function getAdminMarketplaceReports(req, res) {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        r.MarketplaceReportId,
        r.MarketplaceHirdetesId,
        r.HirdetesCim,
        r.HirdetoFelhasznalonev,
        r.IndokKod,
        r.Reszletezes,
        r.Letrehozva,
        r.AdminOlvasva,
        r.AdminValasz,
        r.AdminValaszLetrehozva,
        f.Felhasznalonev AS ReportoloFelhasznalonev
      FROM MarketplaceReport r
      INNER JOIN Felhasznalo f ON f.FelhasznaloId = r.FelhasznaloId
      WHERE r.AdminTorolve = 0
      ORDER BY
        CASE WHEN r.AdminOlvasva = 0 THEN 0 ELSE 1 END,
        r.Letrehozva DESC,
        r.MarketplaceReportId DESC
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Marketplace admin report lista hiba:", error);
    return res.status(500).json({
      message: "Hiba a marketplace reportok lekeresekor.",
    });
  }
}

async function getAdminMarketplaceReportDetail(req, res) {
  try {
    const reportId = Number.parseInt(req.params.reportId, 10);

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ message: "Ervenytelen report azonosito." });
    }

    const pool = await poolPromise;
    await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .query(`
        UPDATE MarketplaceReport
        SET AdminOlvasva = 1
        WHERE MarketplaceReportId = @reportId
          AND AdminTorolve = 0
      `);

    const result = await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .query(`
        SELECT
          r.MarketplaceReportId,
          r.MarketplaceHirdetesId,
          r.HirdetesCim,
          r.HirdetoFelhasznalonev,
          r.IndokKod,
          r.Reszletezes,
          r.Letrehozva,
          r.AdminOlvasva,
          r.AdminValasz,
          r.AdminValaszLetrehozva,
          f.Felhasznalonev AS ReportoloFelhasznalonev
        FROM MarketplaceReport r
        INNER JOIN Felhasznalo f ON f.FelhasznaloId = r.FelhasznaloId
        WHERE r.MarketplaceReportId = @reportId
          AND r.AdminTorolve = 0
      `);

    const report = result.recordset[0];

    if (!report) {
      return res.status(404).json({ message: "A report nem talalhato." });
    }

    return res.status(200).json({
      ...report,
      UgrasUrl: buildMarketplaceJumpUrl(Number(report.MarketplaceHirdetesId)),
    });
  } catch (error) {
    console.error("Marketplace admin report reszlet hiba:", error);
    return res.status(500).json({
      message: "Hiba a marketplace report reszleteinek lekeresekor.",
    });
  }
}

async function replyToMarketplaceReport(req, res) {
  try {
    const reportId = Number.parseInt(req.params.reportId, 10);
    const adminReply = normalizeText(req.body?.adminReply, 2000);

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ message: "Ervenytelen report azonosito." });
    }

    if (!adminReply) {
      return res.status(400).json({ message: "Az admin valasz nem lehet ures." });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .input("adminReply", sql.NVarChar(2000), adminReply)
      .query(`
        UPDATE MarketplaceReport
        SET
          AdminValasz = @adminReply,
          AdminValaszLetrehozva = SYSUTCDATETIME(),
          FelhasznaloOlvastaValaszt = 0,
          AdminOlvasva = 1
        OUTPUT INSERTED.MarketplaceReportId
        WHERE MarketplaceReportId = @reportId
          AND AdminTorolve = 0
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "A report nem talalhato." });
    }

    return res.status(200).json({
      message: "Az admin valasz sikeresen elkuldve.",
    });
  } catch (error) {
    console.error("Marketplace admin report valasz hiba:", error);
    return res.status(500).json({
      message: "Hiba a valasz elkuldese kozben.",
    });
  }
}

async function deleteAdminMarketplaceReport(req, res) {
  try {
    const reportId = Number.parseInt(req.params.reportId, 10);

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ message: "Ervenytelen report azonosito." });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .query(`
        UPDATE MarketplaceReport
        SET AdminTorolve = 1
        OUTPUT INSERTED.MarketplaceReportId
        WHERE MarketplaceReportId = @reportId
          AND AdminTorolve = 0
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "A report nem talalhato." });
    }

    return res.status(200).json({
      message: "A report sikeresen torolve.",
    });
  } catch (error) {
    console.error("Marketplace admin report torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba a report torlese kozben.",
    });
  }
}

async function getUserMarketplaceReportMessages(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT
          MarketplaceReportId,
          MarketplaceHirdetesId,
          HirdetesCim,
          IndokKod,
          Reszletezes,
          Letrehozva,
          AdminValaszLetrehozva,
          FelhasznaloOlvastaValaszt
        FROM MarketplaceReport
        WHERE FelhasznaloId = @userId
          AND AdminValasz IS NOT NULL
          AND FelhasznaloTorolve = 0
        ORDER BY AdminValaszLetrehozva DESC, MarketplaceReportId DESC
      `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Marketplace user report uzenetek hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenetek lekeresekor.",
    });
  }
}

async function getUserMarketplaceReportMessageDetail(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const reportId = Number.parseInt(req.params.reportId, 10);

    if (!userId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ message: "Ervenytelen uzenet azonosito." });
    }

    const pool = await poolPromise;
    await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .input("userId", sql.Int, userId)
      .query(`
        UPDATE MarketplaceReport
        SET FelhasznaloOlvastaValaszt = 1
        WHERE MarketplaceReportId = @reportId
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
          MarketplaceReportId,
          MarketplaceHirdetesId,
          HirdetesCim,
          IndokKod,
          Reszletezes,
          Letrehozva,
          AdminValasz,
          AdminValaszLetrehozva
        FROM MarketplaceReport
        WHERE MarketplaceReportId = @reportId
          AND FelhasznaloId = @userId
          AND FelhasznaloTorolve = 0
          AND AdminValasz IS NOT NULL
      `);

    const message = result.recordset[0];

    if (!message) {
      return res.status(404).json({ message: "Az uzenet nem talalhato." });
    }

    return res.status(200).json({
      ...message,
      UgrasUrl: buildMarketplaceJumpUrl(Number(message.MarketplaceHirdetesId)),
    });
  } catch (error) {
    console.error("Marketplace user report uzenet reszlet hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenet megnyitasa kozben.",
    });
  }
}

async function deleteUserMarketplaceReportMessage(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const reportId = Number.parseInt(req.params.reportId, 10);

    if (!userId) {
      return res.status(401).json({ message: "Bejelentkezes szukseges." });
    }

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ message: "Ervenytelen uzenet azonosito." });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("reportId", sql.Int, reportId)
      .input("userId", sql.Int, userId)
      .query(`
        UPDATE MarketplaceReport
        SET FelhasznaloTorolve = 1
        OUTPUT INSERTED.MarketplaceReportId
        WHERE MarketplaceReportId = @reportId
          AND FelhasznaloId = @userId
          AND FelhasznaloTorolve = 0
          AND AdminValasz IS NOT NULL
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "Az uzenet nem talalhato." });
    }

    return res.status(200).json({
      message: "Az uzenet sikeresen torolve.",
    });
  } catch (error) {
    console.error("Marketplace user report uzenet torlesi hiba:", error);
    return res.status(500).json({
      message: "Hiba az uzenet torlese kozben.",
    });
  }
}

module.exports = {
  REPORT_REASON_CODES,
  getMarketplaceCategories,
  getMarketplaceListings,
  getMarketplaceListingById,
  getMarketplaceListingsForAdmin,
  getMarketplaceListingDetailForAdmin,
  createMarketplaceListing,
  updateMarketplaceListing,
  setMarketplaceListingFrozenState,
  setMarketplaceListingFrozenStateForAdmin,
  deleteMarketplaceListing,
  deleteMarketplaceListingForAdmin,
  createMarketplaceMessage,
  getMarketplaceMessages,
  getMarketplaceMessageDetail,
  replyToMarketplaceMessage,
  deleteMarketplaceMessage,
  createMarketplaceReport,
  getAdminMarketplaceReportNotifications,
  getAdminMarketplaceReports,
  getAdminMarketplaceReportDetail,
  replyToMarketplaceReport,
  deleteAdminMarketplaceReport,
  getUserMarketplaceReportMessages,
  getUserMarketplaceReportMessageDetail,
  deleteUserMarketplaceReportMessage,
};

