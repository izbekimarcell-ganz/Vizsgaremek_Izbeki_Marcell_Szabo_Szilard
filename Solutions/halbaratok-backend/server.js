require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const profileDeleteRoutes = require("./routes/profileDeleteRoutes");
const waterRoutes = require("./routes/waterRoutes");
const speciesRoutes = require("./routes/speciesRoutes");
const catchLogRoutes = require("./routes/catchLogRoutes");
const fishingDayRoutes = require("./routes/fishingDayRoutes");
const forumRoutes = require("./routes/forumRoutes");
const reportRoutes = require("./routes/reportRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const userRoutes = require("./routes/userRoutes");
const friendRoutes = require("./routes/friendRoutes");

const app = express();

const defaultAllowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://halbaratokstorage.z6.web.core.windows.net",
];

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...configuredOrigins]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error("A keres eredet nincs engedelyezve CORS szempontbol."));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
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
app.use("/api/horgasznapok", fishingDayRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Szerver fut a ${PORT} porton`);
});

