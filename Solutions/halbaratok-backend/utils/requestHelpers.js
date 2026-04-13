function normalizeText(value, maxLength = 0) {
  const normalized = String(value || "").trim();
  return maxLength > 0 ? normalized.slice(0, maxLength) : normalized;
}

function parsePositiveInt(value) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function getAuthenticatedUserId(req) {
  return parsePositiveInt(req?.user?.id);
}

module.exports = {
  getAuthenticatedUserId,
  normalizeText,
  parsePositiveInt,
};
