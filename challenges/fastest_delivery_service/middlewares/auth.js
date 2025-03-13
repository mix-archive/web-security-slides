const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, 'secret');
    req.userId = decoded.userId;
    req.isAdmin = decoded.isAdmin;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};