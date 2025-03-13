const dataStore = require('../data/dataStore');

exports.createOrder = (req, res) => {
  try {
    const { foodName, quantity } = req.body;

    const newOrder = {
      id: dataStore.orders.length + 1,
      foodName,
      quantity,
      userId: req.userId
    };

    dataStore.orders.push(newOrder);

    res.status(201).json({ message: 'Order placed!', orderId: newOrder.id });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};