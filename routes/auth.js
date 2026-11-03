// Authentication Module
// For registering and logging in users and administrators.

const express = require('express');
// For encrypting passwords
const bcrypt = require('bcryptjs');
const { UserCredentials } = require('../tables');
const router = express.Router();

async function resetUsers() {
    await UserCredentials.destroy({where: {}, truncate: true});
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

async function checkLogin(req, res) {
    const email = String(req.body.email || "").toLowerCase().trim();
    const password = String(req.body.password || '');

    const user = await UserCredentials.findOne({where: {email}});
    if(!user) {
        return res.status(401).json({success: false, error: "Incorrect Login"});
    }

    const ok = await bcrypt.compare(password, user.password);
    
    if (!ok) {
        return res.status(401).json({success: false, error: "Incorrect Login"});
    }

    res.json({success: true, role: user.role})
}

async function checkRegister(req, res) {
    const email = String(req.body.first || "").toLowerCase().trim();
    const password = req.body.second;
    const role = req.body.role;


    if (!email || !password || !role) {
        return res.status(400).json({ success: false, error: "Missing required fields!" });
    }

    if (role !== "user" && role !== "admin") {
        return res.status(400).json({ success: false, error: "Role must be 'user' or 'admin'." });
    }

    if (email.length > 100) {
        return res.status(400).json({ success: false, error: "Username must be 100 characters or less." });
    }

    if (password.length < 8 || password.length > 15) {
        return res.status(400).json({ success: false, error: "Password must be between 8 and 15 characters." });
    }

    const existing = await UserCredentials.findOne({where: {email}});
    
    if (existing) {
        return res.status(409).json({success: false, error: "That email is already registered with an account!"})
    }

    if(role === "admin"){
        const cardNumber = String(req.body.cardNumber || "").trim();
        const cardExpiry = String(req.body.cardExpiry || "").trim();
        const cardCVV = String(req.body.cardCVV || "").trim();

        if(!cardNumber || !cardExpiry || !cardCVV){
            return res.status(400).json({success: false, error: "Admins must provide credit card information!"});
        }

        // Card number must be 16 digits
        if(cardNumber.length !== 16 || !isAllDigits(cardNumber)){
            return res.status(400).json({success: false, error: "Card Number must be 16 digits (numbers only)!"});
        }

        // Expiry must look like MM/YY
        let month = cardExpiry.substring(0, 2);
        let year = cardExpiry.substring(3, 5);
        if(cardExpiry.length !== 5 || cardExpiry[2] !== "/" || !isAllDigits(month) || !isAllDigits(year)){
            return res.status(400).json({success: false, error: "Expiry must be in MM/YY format!"});
        }

        // Month must be between 01 and 12
        if(Number(month) < 1 || Number(month) > 12){
            return res.status(400).json({success: false, error: "Expiry month must be between 01 and 12!"});
        }

        // Card cannot be expired
        let now = new Date();
        let thisMonth = now.getMonth() + 1;
        let thisYear = now.getFullYear() - 2000;
        if(Number(year) < thisYear || (Number(year) === thisYear && Number(month) < thisMonth)){
            return res.status(400).json({success: false, error: "This card has expired!"});
        }

        // CVV must be 3 digits
        if(cardCVV.length !== 3 || !isAllDigits(cardCVV)){
            return res.status(400).json({success: false, error: "CVV must be 3 digits!"});
        }
    }

    const hashed = await bcrypt.hash(password, 10);
    await UserCredentials.create({email, password: hashed, role})

    res.json({success: true, role});
    
}

router.post('/login', (req, res, next) => checkLogin(req, res).catch(next));
router.post('/register', (req, res, next) => checkRegister(req, res).catch(next));

module.exports = { router, resetUsers };