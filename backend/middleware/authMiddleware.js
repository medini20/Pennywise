const jwt = require("jsonwebtoken");
const JWT_SECRET = require("../utils/jwtSecret");

const getTokenFromHeader = (authorizationHeader = "") => {
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const extractUserIdFromPayload = (payload) => {
  const candidates = [payload?.id, payload?.user_id];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

exports.requireAuth = (req, res, next) => {
  const token = getTokenFromHeader(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = extractUserIdFromPayload(payload);
    req.user = userId
      ? {
          ...payload,
          id: userId,
          user_id: userId
        }
      : payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
