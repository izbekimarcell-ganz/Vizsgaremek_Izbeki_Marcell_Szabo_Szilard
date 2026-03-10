require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const vizteruletekRoutes = require("./routes/vizteruletekRoutes");
const forumRoutes = require("./routes/forumRoutes");
const fogasnaploRoutes = require("./routes/fogasnaploRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API működik");
});

/* ROUTES */

app.use("/api/auth", authRoutes);
app.use("/api/vizteruletek", vizteruletekRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/fogasnaplo", fogasnaploRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Szerver fut a ${PORT} porton`);
  
});