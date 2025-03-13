const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dataStore = require('../data/dataStore');

exports.signup = async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = dataStore.users.find(user => user.username === username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: dataStore.users.length + 1,
      username,
      password: hashedPassword,
      isAdmin: false
    };

    dataStore.users.push(newUser);

    res.status(201).json({ message: 'User created!', userId: newUser.id });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = dataStore.users.find(user => user.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, isAdmin: user.isAdmin }, 'secret', { expiresIn: '1h' });

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};