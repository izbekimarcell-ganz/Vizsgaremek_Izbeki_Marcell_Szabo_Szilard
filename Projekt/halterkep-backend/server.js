require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const profileDeleteRoutes = require("./routes/profileDeleteRoutes");
const waterRoutes = require("./routes/waterRoutes");
const speciesRoutes = require("./routes/speciesRoutes");
const catchLogRoutes = require("./routes/catchLogRoutes");
const forumRoutes = require("./routes/forumRoutes");
const userRoutes = require("./routes/userRoutes");
const friendRoutes = require("./routes/friendRoutes");
const { poolPromise } = require("./DbConfig");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("API mukodik");
});

app.use("/auth", authRoutes);
app.use("/api/profile", profileDeleteRoutes);
app.use("/api/vizteruletek", waterRoutes);
app.use("/api/halfajok", speciesRoutes);
app.use("/api/fogasnaplo", catchLogRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);

async function ensureImageColumns() {
  try {
    const pool = await poolPromise;
    await pool.request().query(`
      IF EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.FogasNaplo')
          AND name = 'FotoUrl'
          AND max_length <> -1
      )
      BEGIN
        ALTER TABLE dbo.FogasNaplo ALTER COLUMN FotoUrl NVARCHAR(MAX) NULL;
      END;

      IF EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.ForumHozzaszolas')
          AND name = 'KepUrl'
          AND max_length <> -1
      )
      BEGIN
        ALTER TABLE dbo.ForumHozzaszolas ALTER COLUMN KepUrl NVARCHAR(MAX) NULL;
      END;
    `);
  } catch (error) {
    console.error("Kep oszlopok ellenorzesi hiba:", error);
  }
}

async function ensureFriendRequestTable() {
  try {
    const pool = await poolPromise;
    await pool.request().query(`
      IF OBJECT_ID(N'dbo.BaratKerelem', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.BaratKerelem
        (
          BaratKerelemId INT IDENTITY(1,1) PRIMARY KEY,
          KezdemenyezoFelhasznaloId INT NOT NULL,
          CimzettFelhasznaloId INT NOT NULL,
          FelhasznaloEgyId AS (
            CASE
              WHEN KezdemenyezoFelhasznaloId < CimzettFelhasznaloId THEN KezdemenyezoFelhasznaloId
              ELSE CimzettFelhasznaloId
            END
          ) PERSISTED,
          FelhasznaloKettoId AS (
            CASE
              WHEN KezdemenyezoFelhasznaloId < CimzettFelhasznaloId THEN CimzettFelhasznaloId
              ELSE KezdemenyezoFelhasznaloId
            END
          ) PERSISTED,
          Allapot NVARCHAR(20) NOT NULL,
          Letrehozva DATETIME2(0) NOT NULL CONSTRAINT DF_BaratKerelem_Letrehozva DEFAULT SYSUTCDATETIME(),
          Valaszolva DATETIME2(0) NULL,
          CONSTRAINT CK_BaratKerelem_Allapot CHECK (Allapot IN ('pending', 'accepted', 'rejected')),
          CONSTRAINT CK_BaratKerelem_Onmaga CHECK (KezdemenyezoFelhasznaloId <> CimzettFelhasznaloId),
          CONSTRAINT UQ_BaratKerelem_Pair UNIQUE (FelhasznaloEgyId, FelhasznaloKettoId),
          CONSTRAINT FK_BaratKerelem_Kezdemenyezo FOREIGN KEY (KezdemenyezoFelhasznaloId)
            REFERENCES dbo.Felhasznalo (FelhasznaloId),
          CONSTRAINT FK_BaratKerelem_Cimzett FOREIGN KEY (CimzettFelhasznaloId)
            REFERENCES dbo.Felhasznalo (FelhasznaloId)
        );

        CREATE INDEX IX_BaratKerelem_Cimzett_Allapot
          ON dbo.BaratKerelem (CimzettFelhasznaloId, Allapot, Letrehozva DESC);
      END
    `);
  } catch (error) {
    console.error("Baratkerelem tabla ellenorzesi hiba:", error);
  }
}

async function bootstrapServer() {
  await ensureImageColumns();
  await ensureFriendRequestTable();

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Szerver fut a ${PORT} porton`);
  });
}

bootstrapServer();
