

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Normalize user info from token
    req.user = {
      _id: decoded.userId || decoded._id || decoded.id || null,
      userId: decoded.userId || decoded._id || decoded.id || null,
      name: decoded.name || null,
      email: decoded.email || null,
      role: decoded.role || null
    };

    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
