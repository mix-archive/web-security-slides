const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/auth');
const router = express.Router();

router.post('/order', authMiddleware, orderController.createOrder);

module.exports = router;