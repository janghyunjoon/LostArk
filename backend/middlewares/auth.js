const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  let token = null;

  // Authorization
  const h = req.headers.authorization || "";
  if (h.toLowerCase().startsWith("bearer")) token = h.slice(7).trim();

  // Cookie
  if (req.cookies?.token) token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "토큰이 없습니다." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // 로그인에서 넣은 키와 맞춰야 함
    req.user = { userId: payload.userId, username: payload.username };
    return next();
  } catch (err) {
    console.error("❌ Invalid token:", err.message);
    return res.status(403).json({ message: "유효하지 않은 토큰입니다." });
  }
}

module.exports = { requireAuth };
