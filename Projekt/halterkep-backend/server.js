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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Szerver fut a ${PORT} porton`);
});

