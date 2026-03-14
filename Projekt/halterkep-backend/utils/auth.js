const jwt = require("jsonwebtoken");

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
}

function authenticateToken(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      message: "Hitelesites szukseges.",
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Ervenytelen vagy lejart token.",
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.admin) {
    return res.status(403).json({
      message: "Admin jogosultsag szukseges.",
    });
  }

  return next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
};
