require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
// const palyaRoutes = require("./routes/palyaRoutes");
// const profileRoutes = require("./routes/profileRoutes");
// const bookingRoutes = require("./routes/bookingRoutes");
// const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API mukodik");
});

app.use("/auth", authRoutes);
// app.use("/api/palyak", palyaRoutes);
// app.use("/api/profile", profileRoutes);
// app.use("/api/bookings", bookingRoutes);
// app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Szerver fut a ${PORT} porton`);
});
