// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { router: userQueueRouter } = require('./routes/userQueue');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(bodyParser.json());

// Mount User Queue API Routes
app.use('/api/queue', userQueueRouter);

// Health check route
app.get('/', (req, res) => {
    res.send('QueueSmart API Server is running...');
});

// Start listening if run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`QueueSmart Backend running on http://localhost:${PORT}`);
    });
}

module.exports = app;