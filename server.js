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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(bodyParser.json());

// Front-end pages (second/) and images, so the pages can call the API on the same server
app.use('/second', express.static(path.join(__dirname, 'second')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Front-end files in the main folder (server.js, routes/ and tests/ are not shared)
const frontEndFiles = ['index.html', 'styles.css', 'script.js', 'popup.js', 'location.js'];
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


// ***** LOGIN + REGISTER LOGIC BELOW *****
const users = {};

function checkLogin(input, output) {
    const username = String(input.body.email || "").toLowerCase().trim();

    if(!users[username] || (users[username].password !== input.body.password)) {
        return output.status(401).json({error: "Incorrect Login"});
    }
    output.json({role: users[username].role})
}

function checkRegister(input, output) {
    const username = String(input.body.first || "").toLowerCase().trim();
    
    if(users[username]){
        return output.status(409).json({error: "That email is already registered with an account!"});
    }

    if(input.body.role === "admin"){
        const cardNumber = String(input.body.cardNumber).trim();
        const cardExpiry = String(input.body.cardExpiry).trim();
        const cardCVV = String(input.body.cardCVV).trim();

        if(!cardNumber || !cardExpiry || !cardCVV){
            return output.status(400).json({error: "Admins must provide credit card information!"});
        }

        // Card number must be 16 digits
        if(cardNumber.length != 16 || !isAllDigits(cardNumber)){
            return output.status(400).json({error: "Card Number must be 16 digits (numbers only)!"});
        }

        // Expiry must look like MM/YY
        let month = cardExpiry.substring(0, 2);
        let year = cardExpiry.substring(3, 5);
        if(cardExpiry.length != 5 || cardExpiry[2] != "/" || !isAllDigits(month) || !isAllDigits(year)){
            return output.status(400).json({error: "Expiry must be in MM/YY format!"});
        }

        // Month must be between 01 and 12
        if(Number(month) < 1 || Number(month) > 12){
            return output.status(400).json({error: "Expiry month must be between 01 and 12!"});
        }

        // Card cannot be expired
        let now = new Date();
        let thisMonth = now.getMonth() + 1;
        let thisYear = now.getFullYear() - 2000;
        if(Number(year) < thisYear || (Number(year) == thisYear && Number(month) < thisMonth)){
            return output.status(400).json({error: "This card has expired!"});
        }

        // CVV must be 3 digits
        if(cardCVV.length != 3 || !isAllDigits(cardCVV)){
            return output.status(400).json({error: "CVV must be 3 digits!"});
        }
    }

    users[username] = {password: input.body.second, role: input.body.role};
    output.json({role: input.body.role});
    
}

// Returns true if the text only has the numbers 0-9
function isAllDigits(text) {
    for(let i = 0; i < text.length; i++){
        if(text[i] < "0" || text[i] > "9"){
            return false;
        }
    }
    return true;
}

app.post('/api/auth/login', checkLogin);
app.post('/api/auth/register', checkRegister);

// ***** LOGIN + REGISTER LOGIC END *****


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