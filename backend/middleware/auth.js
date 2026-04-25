const { verifyToken } = require('../utils/jwt');
const BlacklistToken = require('../models/BlacklistToken');

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const isBlacklisted = await BlacklistToken.findOne({ token });
    if (isBlacklisted) return res.status(401).json({ error: 'Token expired/revoked' });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Invalid token' });

    req.user = decoded; 
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth middleware error' });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticate, authorizeRoles };
