// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const { router: userQueueRouter } = require('./routes/userQueue');
const { router: notificationRouter } = require('./routes/notifications');
const { router: serviceRouter } = require('./routes/services');
const { router: historyRouter } = require('./routes/history');
const { router: adminQueueRouter } = require('./routes/adminQueue');
const { router: authRouter, resetUsers } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(bodyParser.json());

// Front-end pages (second/) and images, so the pages can call the API on the same server
app.use('/second', express.static(path.join(__dirname, 'second')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Front-end files in the main folder (server.js, routes/ and tests/ are not shared)
const frontEndFiles = ['index.html', 'styles.css', 'authentication.js', 'popup.js', 'location.js'];
for (let i = 0; i < frontEndFiles.length; i++) {
    app.get('/' + frontEndFiles[i], function (req, res) {
        res.sendFile(frontEndFiles[i], { root: __dirname });
    });
}

// Home page
app.get('/', function (req, res) {
    res.sendFile('index.html', { root: __dirname });
});

// Mount User Queue API Routes
app.use('/api/queue', userQueueRouter);

// Mount Notification API Routes
app.use('/api/notifications', notificationRouter);

// Mount Service Management API Routes
app.use('/api/services', serviceRouter);

// Mount History API Routes
app.use('/api/history', historyRouter);

// Mount Admin Queue API Routes
app.use('/api/admin/queue', adminQueueRouter);

// Mount Authentication Routes
app.use('/api/auth', authRouter);

// Health check route
app.get('/api/health', (req, res) => {
    res.send('QueueSmart API Server is running...');
});

// Start listening if run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`QueueSmart Backend running on http://localhost:${PORT}`);
    });
}

module.exports = app;
module.exports.resetUsers = resetUsers;