const express = require('express');
const router = express.Router();
const users = {};

function resetUsers() {
    for(const key in users) {
        delete users[key];
    }
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

function checkLogin(input, output) {
    const username = String(input.body.email || "").toLowerCase().trim();

    if(!users[username] || (users[username].password !== input.body.password)) {
        return output.status(401).json({success: false, error: "Incorrect Login"});
    }
    output.json({success: true, role: users[username].role})
}

function checkRegister(input, output) {
    const username = String(input.body.first || "").toLowerCase().trim();
    const password = input.body.second;
    const role = input.body.role;


    if (!username || !password || !role) {
        return output.status(400).json({ success: false, error: "Missing required fields!" });
    }

    if (role !== "user" && role !== "admin") {
        return output.status(400).json({ success: false, error: "Role must be 'user' or 'admin'." });
    }

    if(users[username]){
        return output.status(409).json({success: false, error: "That email is already registered with an account!"});
    }

    if(input.body.role === "admin"){
        const cardNumber = String(input.body.cardNumber).trim();
        const cardExpiry = String(input.body.cardExpiry).trim();
        const cardCVV = String(input.body.cardCVV).trim();

        if(!cardNumber || !cardExpiry || !cardCVV){
            return output.status(400).json({success: false, error: "Admins must provide credit card information!"});
        }

        // Card number must be 16 digits
        if(cardNumber.length !== 16 || !isAllDigits(cardNumber)){
            return output.status(400).json({success: false, error: "Card Number must be 16 digits (numbers only)!"});
        }

        // Expiry must look like MM/YY
        let month = cardExpiry.substring(0, 2);
        let year = cardExpiry.substring(3, 5);
        if(cardExpiry.length !== 5 || cardExpiry[2] !== "/" || !isAllDigits(month) || !isAllDigits(year)){
            return output.status(400).json({success: false, error: "Expiry must be in MM/YY format!"});
        }

        // Month must be between 01 and 12
        if(Number(month) < 1 || Number(month) > 12){
            return output.status(400).json({success: false, error: "Expiry month must be between 01 and 12!"});
        }

        // Card cannot be expired
        let now = new Date();
        let thisMonth = now.getMonth() + 1;
        let thisYear = now.getFullYear() - 2000;
        if(Number(year) < thisYear || (Number(year) === thisYear && Number(month) < thisMonth)){
            return output.status(400).json({success: false, error: "This card has expired!"});
        }

        // CVV must be 3 digits
        if(cardCVV.length !== 3 || !isAllDigits(cardCVV)){
            return output.status(400).json({success: false, error: "CVV must be 3 digits!"});
        }
    }

    users[username] = {password: input.body.second, role: input.body.role};
    output.json({success: true, role: input.body.role});
    
}

router.post('/login', checkLogin);
router.post('/register', checkRegister);

module.exports = { router, resetUsers };