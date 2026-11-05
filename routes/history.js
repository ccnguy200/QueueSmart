// History Module
// Tracks queue-participation history (served / left / missed), persisted in SQLite
const express = require('express');
const router = express.Router();
const { NotificationHistory } = require('../tables');

// The outcomes a history record can have
const OUTCOMES = ["Served", "Left Queue", "Missed"];

// Turn a date into a "YYYY-MM-DD" string
function formatDate(date) {
    const year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();

    if (month < 10) {
        month = "0" + month;
    }
    if (day < 10) {
        day = "0" + day;
    }

    return year + "-" + month + "-" + day;
}

// Record one history entry (called when a user leaves, is served, or is a no-show)
// Returns the new record, or null if the inputs are not valid
async function recordEntry(userName, service, outcome, wait) {
    if (!userName || typeof userName !== "string" || userName.trim() === "") {
        return null;
    }
    if (!service || typeof service !== "string" || service.trim() === "") {
        return null;
    }
    if (OUTCOMES.indexOf(outcome) === -1) {
        return null;
    }

    let waitMinutes = Number(wait);
    if (isNaN(waitMinutes) || waitMinutes < 0) {
        waitMinutes = 0;
    }

    const record = await NotificationHistory.create({
        userName: userName,
        type: "history",
        message: userName + " was " + outcome + " from the " + service + " queue.",
        service: service,
        outcome: outcome,
        wait: waitMinutes,
        date: formatDate(new Date())
    });

    return record;
}

// route: list history, newest first
// GET /api/history?userName=user@email.com  (optional filter)
// GET /api/history?outcome=Served           (optional filter)
router.get('/', async function (req, res) {
    const userName = req.query.userName;
    const outcome = req.query.outcome;

    const where = { type: "history" };
    if (userName) {
        where.userName = userName;
    }
    if (outcome) {
        where.outcome = outcome;
    }

    try {
        const history = await NotificationHistory.findAll({
            where: where,
            order: [['createdAt', 'DESC']]
        });
        return res.json({ success: true, history: history });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

module.exports = {
    router: router,
    recordEntry: recordEntry,
    OUTCOMES: OUTCOMES
};
