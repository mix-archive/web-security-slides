const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/auth');
const router = express.Router();

router.get('/orders', authMiddleware, (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}, adminController.getAllOrders);

module.exports = router;