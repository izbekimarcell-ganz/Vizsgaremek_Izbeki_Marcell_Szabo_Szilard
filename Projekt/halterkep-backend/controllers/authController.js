const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../DbConfig");

//register
const register = async (req, res) => {
  try {
    const { email, felhasznalonev, password } = req.body;

    if (!email || !felhasznalonev || !password) {
      return res.status(400).json({
        message: "Minden kotelezo mezot ki kell tolteni.",
      });
    }

    const pool = await poolPromise;

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

    const jelszo_hash = await bcrypt.hash(password, 10);

    const result = await pool
      .request()
      .input("felhasznalonev", sql.NVarChar(50), felhasznalonev)
      .input("email", sql.NVarChar(100), email)
      .input("jelszo_hash", sql.VarBinary(64), jelszo_hash)
      .query(`
        INSERT INTO dbo.Felhasznalo (Felhasznalonev, Email, JelszoHash, Aktiv)
        OUTPUT
          INSERTED.FelhasznaloId,
          INSERTED.Felhasznalonev,
          INSERTED.Email,
          INSERTED.Letrehozva
        VALUES (@felhasznalonev, @email, @jelszo_hash, 1)
      `);

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

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("identifier", sql.NVarChar(100), identifier)
      .query(`
        SELECT
          FelhasznaloId,
          Felhasznalonev,
          Email,
          JelszoHash,
          Aktiv
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

    const helyesJelszo = await bcrypt.compare(password, user.JelszoHash);

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