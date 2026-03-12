const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sql, getPool } = require("../DbConfig");

const hashPasswordWithSalt = (password, saltBuffer) => {
  return crypto
    .createHash("sha512")
    .update(Buffer.concat([saltBuffer, Buffer.from(password, "utf8")]))
    .digest();
};

const getAuthSchemaInfo = async (pool) => {
  const schemaResult = await pool.request().query(`
    SELECT
      CASE WHEN COL_LENGTH('dbo.Felhasznalo', 'JelszoSo') IS NULL THEN 0 ELSE 1 END AS hasJelszoSo,
      CASE WHEN COL_LENGTH('dbo.Felhasznalo', 'SzerepkorId') IS NULL THEN 0 ELSE 1 END AS hasSzerepkorId,
      CASE WHEN COL_LENGTH('dbo.Felhasznalo', 'Admin') IS NULL THEN 0 ELSE 1 END AS hasAdminColumn,
      CASE WHEN OBJECT_ID('dbo.Szerepkor', 'U') IS NULL THEN 0 ELSE 1 END AS hasSzerepkorTable
  `);

  return {
    hasJelszoSo: schemaResult.recordset[0].hasJelszoSo === 1,
    hasSzerepkorId: schemaResult.recordset[0].hasSzerepkorId === 1,
    hasAdminColumn: schemaResult.recordset[0].hasAdminColumn === 1,
    hasSzerepkorTable: schemaResult.recordset[0].hasSzerepkorTable === 1,
  };
};

//register
const register = async (req, res) => {
  try {
    const { email, felhasznalonev, password } = req.body;

    if (!email || !felhasznalonev || !password) {
      return res.status(400).json({
        message: "Minden kotelezo mezot ki kell tolteni.",
      });
    }

    const pool = await getPool();
    const schemaInfo = await getAuthSchemaInfo(pool);

    const existingUser = await pool
      .request()
      .input("email", sql.NVarChar(100), email)
      .input("felhasznalonev", sql.NVarChar(50), felhasznalonev)
      .query(`
        SELECT FelhasznaloId
        FROM dbo.Felhasznalo
        WHERE Email = @email OR Felhasznalonev = @felhasznalonev
      `);

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({
        message: "Az email vagy a felhasznalonev mar foglalt.",
      });
    }

    const request = pool
      .request()
      .input("felhasznalonev", sql.NVarChar(50), felhasznalonev)
      .input("email", sql.NVarChar(100), email);

    let result;

    if (schemaInfo.hasJelszoSo) {
      const jelszoSo = crypto.randomBytes(16);
      const jelszoHashBuffer = hashPasswordWithSalt(password, jelszoSo);

      request
        .input("jelszo_hash", sql.VarBinary(64), jelszoHashBuffer)
        .input("jelszo_so", sql.VarBinary(16), jelszoSo);

      if (schemaInfo.hasSzerepkorId && schemaInfo.hasSzerepkorTable) {
        const userRoleResult = await pool
          .request()
          .input("roleName", sql.NVarChar(30), "User")
          .query(`
            SELECT TOP 1 SzerepkorId
            FROM dbo.Szerepkor
            WHERE Nev = @roleName
          `);

        const userRole = userRoleResult.recordset[0];

        if (!userRole) {
          return res.status(500).json({
            message: "A 'User' szerepkor hianyzik az adatbazisbol.",
          });
        }

        result = await request
          .input("szerepkor_id", sql.Int, userRole.SzerepkorId)
          .query(`
            INSERT INTO dbo.Felhasznalo (Felhasznalonev, Email, JelszoHash, JelszoSo, SzerepkorId, Aktiv)
            OUTPUT
              INSERTED.FelhasznaloId,
              INSERTED.Felhasznalonev,
              INSERTED.Email,
              INSERTED.Letrehozva
            VALUES (@felhasznalonev, @email, @jelszo_hash, @jelszo_so, @szerepkor_id, 1)
          `);
      } else {
        result = await request.query(`
          INSERT INTO dbo.Felhasznalo (Felhasznalonev, Email, JelszoHash, JelszoSo, Aktiv)
          OUTPUT
            INSERTED.FelhasznaloId,
            INSERTED.Felhasznalonev,
            INSERTED.Email,
            INSERTED.Letrehozva
          VALUES (@felhasznalonev, @email, @jelszo_hash, @jelszo_so, 1)
        `);
      }
    } else {
      const bcryptHash = await bcrypt.hash(password, 10);
      const bcryptHashBuffer = Buffer.from(bcryptHash, "utf8");
      request.input("jelszo_hash", sql.VarBinary(sql.MAX), bcryptHashBuffer);

      if (schemaInfo.hasSzerepkorId && schemaInfo.hasSzerepkorTable) {
        const userRoleResult = await pool
          .request()
          .input("roleName", sql.NVarChar(30), "User")
          .query(`
            SELECT TOP 1 SzerepkorId
            FROM dbo.Szerepkor
            WHERE Nev = @roleName
          `);

        const userRole = userRoleResult.recordset[0];

        if (!userRole) {
          return res.status(500).json({
            message: "A 'User' szerepkor hianyzik az adatbazisbol.",
          });
        }

        result = await request
          .input("szerepkor_id", sql.Int, userRole.SzerepkorId)
          .query(`
            INSERT INTO dbo.Felhasznalo (Felhasznalonev, Email, JelszoHash, SzerepkorId, Aktiv)
            OUTPUT
              INSERTED.FelhasznaloId,
              INSERTED.Felhasznalonev,
              INSERTED.Email,
              INSERTED.Letrehozva
            VALUES (@felhasznalonev, @email, @jelszo_hash, @szerepkor_id, 1)
          `);
      } else {
        result = await request.query(`
          INSERT INTO dbo.Felhasznalo (Felhasznalonev, Email, JelszoHash, Aktiv)
          OUTPUT
            INSERTED.FelhasznaloId,
            INSERTED.Felhasznalonev,
            INSERTED.Email,
            INSERTED.Letrehozva
          VALUES (@felhasznalonev, @email, @jelszo_hash, 1)
        `);
      }
    }

    return res.status(201).json({
      message: "Sikeres regisztracio.",
      user: result.recordset[0],
    });
  } catch (error) {
    console.error("Register hiba:", error);
    return res.status(500).json({
      message: "Szerverhiba tortent.",
    });
  }
};

//login
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Az email vagy felhasznalonev, es a jelszo kotelezo.",
      });
    }

    const pool = await getPool();
    const schemaInfo = await getAuthSchemaInfo(pool);

    const selectColumns = [
      "FelhasznaloId",
      "Felhasznalonev",
      "Email",
      "JelszoHash",
      "Aktiv",
      schemaInfo.hasJelszoSo ? "JelszoSo" : "CAST(NULL AS VARBINARY(16)) AS JelszoSo",
      schemaInfo.hasSzerepkorId ? "SzerepkorId" : "CAST(NULL AS INT) AS SzerepkorId",
      schemaInfo.hasAdminColumn ? "Admin" : "CAST(NULL AS BIT) AS Admin",
    ];

    const result = await pool
      .request()
      .input("identifier", sql.NVarChar(100), identifier)
      .query(`
        SELECT ${selectColumns.join(",\n          ")}
        FROM dbo.Felhasznalo
        WHERE Email = @identifier OR Felhasznalonev = @identifier
      `);

    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({
        message: "Hibas belepesi adatok.",
      });
    }

    if (!user.Aktiv) {
      return res.status(403).json({
        message: "A fiok inaktiv.",
      });
    }

    const taroltHashBuffer = Buffer.isBuffer(user.JelszoHash)
      ? user.JelszoHash
      : Buffer.from(user.JelszoHash || []);
    const taroltSoBuffer = Buffer.isBuffer(user.JelszoSo)
      ? user.JelszoSo
      : Buffer.from(user.JelszoSo || []);

    let helyesJelszo = false;

    if (schemaInfo.hasJelszoSo && taroltHashBuffer.length > 0 && taroltSoBuffer.length === 16) {
      const szamitottHash = hashPasswordWithSalt(password, taroltSoBuffer);
      helyesJelszo =
        taroltHashBuffer.length === szamitottHash.length &&
        crypto.timingSafeEqual(taroltHashBuffer, szamitottHash);
    } else {
      const taroltHashSzoveg = taroltHashBuffer.toString("utf8");
      if (taroltHashSzoveg.startsWith("$2")) {
        helyesJelszo = await bcrypt.compare(password, taroltHashSzoveg);
      }
    }

    if (!helyesJelszo) {
      return res.status(401).json({
        message: "Hibas belepesi adatok.",
      });
    }

    const token = jwt.sign(
      {
        id: user.FelhasznaloId,
        email: user.Email,
        felhasznalonev: user.Felhasznalonev,
        szerepkorId: user.SzerepkorId,
        admin: user.Admin,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Sikeres bejelentkezes.",
      token,
      user: {
        FelhasznaloId: user.FelhasznaloId,
        Felhasznalonev: user.Felhasznalonev,
        Email: user.Email,
      },
    });
  } catch (error) {
    console.error("Login hiba:", error);
    return res.status(500).json({
      message: "Szerverhiba tortent.",
    });
  }
};

module.exports = {
  register,
  login,
};