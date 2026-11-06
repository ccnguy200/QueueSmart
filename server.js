// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const { sequelize } = require('./tables');
const { router: userQueueRouter } = require('./routes/userQueue');
const { router: notificationRouter } = require('./routes/notifications');
const { router: serviceRouter, seedServices } = require('./routes/services');
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
const frontEndFiles = ['index.html', 'styles.css', 'authentication.js', 'popup.js', 'location.js', 'bell.js'];
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

// Sync SQLite Database, seed the mock services, and start listening if run directly.
// (When required by the tests, the tests control syncing in their own beforeAll/beforeEach.)
if (require.main === module) {
    sequelize.sync()
        .then(async () => {
            await seedServices();
            console.log('SQLite Database Connected & Synced.');
            app.listen(PORT, () => {
                console.log(`QueueSmart Backend running on http://localhost:${PORT}`);
            });
        })
        .catch(function (err) {
            const message = String((err && err.message) || err);
            if (message.indexOf('SQLITE_ERROR') !== -1) {
                console.error('\nCould not start: your local queueSmart.sqlite has an old schema.');
                console.error('Delete the local database and start again:');
                console.error('    npm run reset-db\n');
            } else {
                console.error(err);
            }
            process.exit(1);
        });
}

module.exports = app;
module.exports.resetUsers = resetUsers;
