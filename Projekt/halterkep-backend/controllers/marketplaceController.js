const { sql, poolPromise } = require("../DbConfig");

const ALLOWED_SORTS = new Set(["featured", "price-asc", "price-desc", "newest"]);

function normalizeText(value, maxLength = 0) {
  const normalized = String(value || "").trim();
  return maxLength > 0 ? normalized.slice(0, maxLength) : normalized;
}

function normalizeSort(value) {
  const sort = normalizeText(value, 20).toLowerCase();
  return ALLOWED_SORTS.has(sort) ? sort : "featured";
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
      message: "Hiba a marketplace kategóriák lekérésekor.",
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
          mh.Cim,
          mh.Leiras,
          mh.ArFt,
          mh.Telepules,
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
      message: "Hiba a marketplace hirdetések lekérésekor.",
    });
  }
}

async function getMarketplaceListingById(req, res) {
  try {
    const listingId = Number(req.params?.id);

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ message: "Érvénytelen hirdetés azonosító." });
    }

    const pool = await poolPromise;
    const listingResult = await pool
      .request()
      .input("listingId", sql.Int, listingId)
      .query(`
        SELECT
          mh.MarketplaceHirdetesId,
          mh.Cim,
          mh.Leiras,
          mh.ArFt,
          mh.Telepules,
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
      return res.status(404).json({ message: "A keresett hirdetés nem található." });
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
      message: "Hiba a marketplace hirdetés részleteinek lekérésekor.",
    });
  }
}

module.exports = {
  getMarketplaceCategories,
  getMarketplaceListings,
  getMarketplaceListingById,
};
