const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../DbConfig");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).+$/;

const mapUser = (user) => ({
  id: user.FelhasznaloId,
  username: user.Felhasznalonev,
  email: user.Email,
  admin: Boolean(user.Admin),
  aktiv: Boolean(user.Aktiv),
  letrehozva: user.Letrehozva,
});

const normalizeEmail = (email) => email.trim().toLowerCase();

const validateRegisterInput = ({ email, username, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const trimmedUsername = username.trim();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return "Adj meg egy érvényes email címet.";
  }

  if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
    return "A felhasználónév minimum 3, maximum 50 karakter lehet.";
  }

  if (password.length < 8) {
    return "A jelszónak legalább 8 karakter hosszúnak kell lennie.";
  }

  if (!PASSWORD_REGEX.test(password)) {
    return "A jelszónak tartalmaznia kell legalább egy nagybetűt és egy számot.";
  }

  return null;
};

const register = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        message: "Az email, felhasználónév és jelszó kötelező.",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const trimmedUsername = username.trim();
    const validationError = validateRegisterInput({
      email,
      username,
      password,
    });

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const pool = await poolPromise;

    const existingUser = await pool
      .request()
      .input("email", sql.NVarChar(100), normalizedEmail)
      .input("username", sql.NVarChar(50), trimmedUsername)
      .query(`
        SELECT FelhasznaloId, Email, Felhasznalonev
        FROM Felhasznalo
        WHERE Email = @email OR Felhasznalonev = @username
      `);

    const foundUser = existingUser.recordset[0];

    if (foundUser) {
      if ((foundUser.Email || "").trim().toLowerCase() === normalizedEmail) {
        return res.status(409).json({
          message: "Ez az email cím már foglalt.",
        });
      }

      return res.status(409).json({
        message: "Ez a felhasználónév már foglalt.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool
      .request()
      .input("username", sql.NVarChar(50), trimmedUsername)
      .input("email", sql.NVarChar(100), normalizedEmail)
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
      message: "Sikeres regisztráció.",
      user: mapUser(result.recordset[0]),
    });
  } catch (error) {
    console.error("Register hiba:", error);

    if (error?.number === 2601 || error?.number === 2627) {
      return res.status(409).json({
        message: "Az email cím vagy a felhasználónév már foglalt.",
      });
    }

    return res.status(500).json({
      message: "Szerverhiba történt.",
    });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Az email vagy felhasználónév, és a jelszó kötelező.",
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
        message: "Hibás belépési adatok.",
      });
    }

    if (!user.Aktiv) {
      return res.status(403).json({
        message: "A fiók inaktív.",
      });
    }

    const helyesJelszo = await bcrypt.compare(password, user.JelszoHash);

    if (!helyesJelszo) {
      return res.status(401).json({
        message: "Hibás belépési adatok.",
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
      message: "Sikeres bejelentkezés.",
      token,
      user: mapUser(user),
    });
  } catch (error) {
    console.error("Login hiba:", error);
    return res.status(500).json({
      message: "Szerverhiba történt.",
    });
  }
};

module.exports = {
  register,
  login,
};
