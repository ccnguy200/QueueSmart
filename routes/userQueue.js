// Added export
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({message: "Queue API is working"});
});

module.exports = {router};