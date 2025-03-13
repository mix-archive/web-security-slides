const dataStore = require('../data/dataStore');

exports.getAllOrders = (req, res) => {
  try {
    const ordersWithUsernames = dataStore.orders.map(order => {
      const user = dataStore.users.find(user => user.id === order.userId);
      return {
        ...order,
        username: user ? user.username : 'Unknown'
      };
    });

    res.status(200).json({ orders: ordersWithUsernames });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};