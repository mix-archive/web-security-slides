const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require("crypto");

const app = express();
const PORT = 3000;

// In-memory data storage
let users = {};
let orders = {};
let addresses = {};

// Inserting admin user
users['admin'] = { password: crypto.randomBytes(16).toString('hex'), orders: [], address: '' };

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use(session({
    secret: crypto.randomBytes(16).toString('hex'),
    resave: false,
    saveUninitialized: true
}));

// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users[username];

    if (user && user.password === password) {
        req.session.user = { username };
        res.redirect('/');
    } else {
        res.send('Invalid credentials. <a href="/login">Try again</a>.');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (Object.prototype.hasOwnProperty.call(users, username)) {
        res.send('Username already exists. <a href="/register">Try a different username</a>.');
    } else {
        users[username] = { password, orders: [], address: '' };
        req.session.user = { username };
        res.redirect(`/address`);
    }
});

app.get('/address', (req, res) => {
    const { user } = req.session;
    if (user && users[user.username]) {
        res.render('address', { username: user.username });
    } else {
        res.redirect('/register');
    }
});

app.post('/address', (req, res) => {
    const { user } = req.session;
    const { addressId, Fulladdress } = req.body;

    if (user && users[user.username]) {
        addresses[user.username][addressId] = Fulladdress;
        users[user.username].address = addressId;
        res.redirect('/login');
    } else {
        res.redirect('/register');
    }
});



app.get('/order', (req, res) => {
    if (req.session.user) {
        res.render('order');
    } else {
        res.redirect('/login');
    }
});

app.post('/order', (req, res) => {
    if (req.session.user) {
        const { item, quantity } = req.body;
        const orderId = `order-${Date.now()}`;
        orders[orderId] = { item, quantity, username: req.session.user.username };
        users[req.session.user.username].orders.push(orderId);
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

app.get('/admin', (req, res) => {
    if (req.session.user && req.session.user.username === 'admin') {
        const allOrders = Object.keys(orders).map(orderId => ({
            ...orders[orderId],
            orderId
        }));
        res.render('admin', { orders: allOrders });
    } else {
        res.redirect('/');
    }
});


// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});