const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../DbConfig");

//register
const register = async (req, res) => {
  try {
    const { email, username, teljes_nev, password, szerep } = req.body;

    if (!email || !username || !teljes_nev || !password || !szerep) {
      return res.status(400).json({
        message: "Minden kotelezo mezot ki kell tolteni.",
      });
    }

    const allowedRoles = ["berlo", "palyatulajdonos"];
    if (!allowedRoles.includes(szerep)) {
      return res.status(400).json({
        message: "Ervenytelen szerepkor.",
      });
    }

    const pool = await poolPromise;

    const existingUser = await pool
      .request()
      .input("email", sql.NVarChar(200), email)
      .input("username", sql.NVarChar(50), username)
      .query(`
        SELECT felhasznalo_id
        FROM Felhasznalok
        WHERE email = @email OR username = @username
      `);

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({
        message: "Az email vagy a felhasznalonev mar foglalt.",
      });
    }

    const jelszo_hash = await bcrypt.hash(password, 10);

    const result = await pool
      .request()
      .input("username", sql.NVarChar(50), username)
      .input("teljes_nev", sql.NVarChar(150), teljes_nev)
      .input("email", sql.NVarChar(200), email)
      .input("jelszo_hash", sql.NVarChar(300), jelszo_hash)
      .input("szerep", sql.NVarChar(50), szerep)
      .query(`
        INSERT INTO Felhasznalok (username, teljes_nev, email, jelszo_hash, szerep)
        OUTPUT
          INSERTED.felhasznalo_id,
          INSERTED.username,
          INSERTED.teljes_nev,
          INSERTED.email,
          INSERTED.szerep,
          INSERTED.letrehozva
        VALUES (@username, @teljes_nev, @email, @jelszo_hash, @szerep)
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
      .input("identifier", sql.NVarChar(200), identifier)
      .query(`
        SELECT
          felhasznalo_id,
          username,
          teljes_nev,
          email,
          jelszo_hash,
          szerep,
          aktiv
        FROM Felhasznalok
        WHERE email = @identifier OR username = @identifier
      `);

    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({
        message: "Hibas belepesi adatok.",
      });
    }

    if (!user.aktiv) {
      return res.status(403).json({
        message: "A fiok inaktiv.",
      });
    }

    const helyesJelszo = await bcrypt.compare(password, user.jelszo_hash);

    if (!helyesJelszo) {
      return res.status(401).json({
        message: "Hibas belepesi adatok.",
      });
    }

    await pool
      .request()
      .input("felhasznalo_id", sql.Int, user.felhasznalo_id)
      .query(`
        UPDATE Felhasznalok
        SET utoljara_belepett = SYSDATETIME()
        WHERE felhasznalo_id = @felhasznalo_id
      `);

    const token = jwt.sign(
      {
        id: user.felhasznalo_id,
        email: user.email,
        username: user.username,
        szerep: user.szerep,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Sikeres bejelentkezes.",
      token,
      user: {
        felhasznalo_id: user.felhasznalo_id,
        username: user.username,
        teljes_nev: user.teljes_nev,
        email: user.email,
        szerep: user.szerep,
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