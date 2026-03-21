const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../DbConfig");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).+$/;
const SECURITY_QUESTIONS = [
  "Mi volt a beceneved gyerekkorodban?",
  "Mi volt az elso haziallatod neve?",
  "Mi a kedvenc filmed cime?",
  "Mi annak a varosnak a neve, ahol altalanos iskolaba jartal?",
  "Mi volt a kedvenc tantargyad gyerekkorodban?",
  "Mi az edesanyad keresztneve?",
];

const mapUser = (user) => ({
  id: user.FelhasznaloId,
  username: user.Felhasznalonev,
  email: user.Email,
  profileImageUrl: user.ProfilKepUrl || null,
  bio: user.Bemutatkozas || "",
  admin: Boolean(user.Admin),
  aktiv: Boolean(user.Aktiv),
  letrehozva: user.Letrehozva,
  private: Boolean(user.Privat),
});

const normalizeEmail = (email = "") => email.trim().toLowerCase();
const normalizeSecurityAnswer = (answer = "") =>
  answer.trim().toLowerCase().replace(/\s+/g, " ");

function validatePassword(password) {
  if (password.length < 8) {
    return "A jelszonak legalabb 8 karakter hosszu kell legyen.";
  }

  if (!PASSWORD_REGEX.test(password)) {
    return "A jelszonak tartalmaznia kell legalabb egy nagybetut es egy szamot.";
  }

  return null;
}

function validateRegisterInput({ email, username, password, securityQuestion, securityAnswer }) {
  const normalizedEmail = normalizeEmail(email);
  const trimmedUsername = username.trim();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return "Adj meg egy érvényes email címet.";
  }

  if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
    return "A felhasználónév minimum 3, maximum 50 karakter lehet.";
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return passwordError;
  }

  if (!SECURITY_QUESTIONS.includes(securityQuestion)) {
    return "Válassz egy érvényes biztonsági kérdést.";
  }

  if (normalizeSecurityAnswer(securityAnswer).length < 2) {
    return "Adj meg egy biztonsági választ is.";
  }

  return null;
}

async function register(req, res) {
  try {
    const { email, username, password, securityQuestion, securityAnswer } = req.body;

    if (!email || !username || !password || !securityQuestion || !securityAnswer) {
      return res.status(400).json({
        message: "Az email, felhasználónév, jelszó, biztonsági kérdés és válasz kötelező.",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const trimmedUsername = username.trim();
    const validationError = validateRegisterInput({
      email,
      username,
      password,
      securityQuestion,
      securityAnswer,
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
    const securityAnswerHash = await bcrypt.hash(normalizeSecurityAnswer(securityAnswer), 10);

    const result = await pool
      .request()
      .input("username", sql.NVarChar(50), trimmedUsername)
      .input("email", sql.NVarChar(100), normalizedEmail)
      .input("passwordHash", sql.NVarChar(255), passwordHash)
      .input("securityQuestion", sql.NVarChar(200), securityQuestion)
      .input("securityAnswerHash", sql.NVarChar(255), securityAnswerHash)
      .query(`
        INSERT INTO Felhasznalo
          (Felhasznalonev, Email, JelszoHash, BiztonsagiKerdes, BiztonsagiValaszHash)
        OUTPUT
          INSERTED.FelhasznaloId,
          INSERTED.Felhasznalonev,
          INSERTED.Email,
          INSERTED.ProfilKepUrl,
          INSERTED.Bemutatkozas,
          INSERTED.Admin,
          INSERTED.Aktiv,
          INSERTED.Letrehozva,
          INSERTED.Privat
        VALUES
          (@username, @email, @passwordHash, @securityQuestion, @securityAnswerHash)
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
}

async function login(req, res) {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Az email vagy felhasználónév és a jelszó kötelező.",
      });
    }

    const normalizedIdentifier = identifier.trim();
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("identifier", sql.NVarChar(100), normalizedIdentifier)
      .query(`
        SELECT
          FelhasznaloId,
          Felhasznalonev,
          Email,
          ProfilKepUrl,
          Bemutatkozas,
          JelszoHash,
          Admin,
          Aktiv,
          Letrehozva,
          Privat
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

    const isCorrectPassword = await bcrypt.compare(password, user.JelszoHash);

    if (!isCorrectPassword) {
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
}

async function getForgotPasswordQuestion(req, res) {
  try {
    const identifier = typeof req.body?.identifier === "string" ? req.body.identifier.trim() : "";

    if (!identifier) {
      return res.status(400).json({
        message: "Add meg a felhasználónevet vagy email címet.",
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("identifier", sql.NVarChar(100), identifier)
      .query(`
        SELECT FelhasznaloId, Admin, BiztonsagiKerdes, BiztonsagiValaszHash
        FROM Felhasznalo
        WHERE Email = @identifier OR Felhasznalonev = @identifier
      `);

    const user = result.recordset[0];

    if (!user) {
      return res.status(404).json({
        message: "Nem található ilyen felhasználó.",
      });
    }

    if (user.Admin) {
      return res.status(403).json({
        message: "Az admin fiók jelszava itt nem állítható vissza.",
      });
    }

    if (!user.BiztonsagiKerdes || !user.BiztonsagiValaszHash) {
      return res.status(400).json({
        message: "Ehhez a fiókhoz nincs beállítva biztonsági kérdés.",
      });
    }

    return res.status(200).json({
      question: user.BiztonsagiKerdes,
    });
  } catch (error) {
    console.error("Biztonsági kérdés lekérési hiba:", error);
    return res.status(500).json({
      message: "Szerverhiba történt.",
    });
  }
}

async function resetPasswordWithSecurityQuestion(req, res) {
  try {
    const identifier = typeof req.body?.identifier === "string" ? req.body.identifier.trim() : "";
    const securityAnswer = typeof req.body?.securityAnswer === "string" ? req.body.securityAnswer : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

    if (!identifier || !securityAnswer || !newPassword) {
      return res.status(400).json({
        message: "Az azonosító, a biztonsági válasz és az új jelszó kötelező.",
      });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("identifier", sql.NVarChar(100), identifier)
      .query(`
        SELECT FelhasznaloId, Admin, BiztonsagiValaszHash
        FROM Felhasznalo
        WHERE Email = @identifier OR Felhasznalonev = @identifier
      `);

    const user = result.recordset[0];

    if (!user) {
      return res.status(404).json({
        message: "Nem található ilyen felhasználó.",
      });
    }

    if (user.Admin) {
      return res.status(403).json({
        message: "Az admin fiók jelszava itt nem állítható vissza.",
      });
    }

    if (!user.BiztonsagiValaszHash) {
      return res.status(400).json({
        message: "Ehhez a fiókhoz nincs beállítva biztonsági kérdés.",
      });
    }

    const isCorrectAnswer = await bcrypt.compare(
      normalizeSecurityAnswer(securityAnswer),
      user.BiztonsagiValaszHash
    );

    if (!isCorrectAnswer) {
      return res.status(401).json({
        message: "A biztonsági válasz nem egyezik.",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool
      .request()
      .input("userId", sql.Int, user.FelhasznaloId)
      .input("passwordHash", sql.NVarChar(255), passwordHash)
      .query(`
        UPDATE Felhasznalo
        SET JelszoHash = @passwordHash
        WHERE FelhasznaloId = @userId
      `);

    return res.status(200).json({
      message: "A jelszo sikeresen modosult.",
    });
  } catch (error) {
    console.error("Jelszo visszaallitas hiba:", error);
    return res.status(500).json({
      message: "Szerverhiba történt.",
    });
  }
}

module.exports = {
  register,
  login,
  getForgotPasswordQuestion,
  resetPasswordWithSecurityQuestion,
  SECURITY_QUESTIONS,
};
