const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../DbConfig");

const mapUser = (user) => ({
  id: user.FelhasznaloId,
  username: user.Felhasznalonev,
  email: user.Email,
  admin: Boolean(user.Admin),
  aktiv: Boolean(user.Aktiv),
  letrehozva: user.Letrehozva,
});

const register = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        message: "Az email, felhasznalonev es jelszo kotelezo.",
      });
    }

    const pool = await poolPromise;

    const existingUser = await pool
      .request()
      .input("email", sql.NVarChar(100), email)
      .input("username", sql.NVarChar(50), username)
      .query(`
        SELECT FelhasznaloId
        FROM Felhasznalo
        WHERE Email = @email OR Felhasznalonev = @username
      `);

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({
        message: "Az email vagy a felhasznalonev mar foglalt.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool
      .request()
      .input("username", sql.NVarChar(50), username)
      .input("email", sql.NVarChar(100), email)
      .input("passwordHash", sql.NVarChar(255), passwordHash)
      .query(`
        INSERT INTO Felhasznalo (Felhasznalonev, Email, JelszoHash)
        OUTPUT
          INSERTED.FelhasznaloId,
          INSERTED.Felhasznalonev,
          INSERTED.Email,
          INSERTED.Admin,
          INSERTED.Aktiv,
          INSERTED.Letrehozva
        VALUES (@username, @email, @passwordHash)
      `);

    return res.status(201).json({
      message: "Sikeres regisztracio.",
      user: mapUser(result.recordset[0]),
    });
  } catch (error) {
    console.error("Register hiba:", error);
    return res.status(500).json({
      message: "Szerverhiba tortent.",
    });
  }
};

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
          Admin,
          Aktiv,
          Letrehozva
        FROM Felhasznalo
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
        username: user.Felhasznalonev,
        admin: Boolean(user.Admin),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Sikeres bejelentkezes.",
      token,
      user: mapUser(user),
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
