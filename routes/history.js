// History Module
// Tracks the queue participation history for users
// Note: no database yet, history is kept in memory while the server is running
const express = require('express');
const router = express.Router();

// In-memory storage: every history record so far
let history = [];

// Id for the next record
let nextId = 1;

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

// Mock data: past queues from the A2 History screen
function addMockHistory() {
    const mock = [
        { date: "2026-09-14", userName: "user@email.com", service: "Academic Advising", wait: 30, outcome: "Served" },
        { date: "2026-09-11", userName: "user@email.com", service: "Financial Aid Office", wait: 15, outcome: "Served" },
        { date: "2026-09-08", userName: "user@email.com", service: "Tutoring Services", wait: 20, outcome: "Left Queue" },
        { date: "2026-09-03", userName: "user@email.com", service: "Academic Advising", wait: 45, outcome: "Missed" },
        { date: "2026-08-29", userName: "user@email.com", service: "Financial Aid Office", wait: 10, outcome: "Served" },
        { date: "2026-08-25", userName: "user@email.com", service: "Tutoring Services", wait: 5, outcome: "Served" }
    ];

    for (let i = 0; i < mock.length; i++) {
        history.push({
            id: nextId,
            date: mock[i].date,
            userName: mock[i].userName,
            service: mock[i].service,
            wait: mock[i].wait,
            outcome: mock[i].outcome
        });
        nextId++;
    }
}

// Start over with only the mock history (also used by the unit tests)
// Note: the array is cleared in place so the exported reference stays valid
function resetHistory() {
    history.length = 0;
    nextId = 1;
    addMockHistory();
}

// Record one history entry (called when a user joins, leaves, or is served)
// Returns the new record, or null if the inputs are not valid
function recordEntry(userName, service, outcome, wait) {
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

    const record = {
        id: nextId,
        date: formatDate(new Date()),
        userName: userName,
        service: service,
        wait: waitMinutes,
        outcome: outcome
    };
    nextId++;

    // Newest first, so the front end shows the latest activity at the top
    history.unshift(record);

    return record;
}

// route: list history, newest first
// GET /api/history?userName=user@email.com  (optional filter)
// GET /api/history?outcome=Served           (optional filter)
router.get('/', function (req, res) {
    const userName = req.query.userName;
    const outcome = req.query.outcome;

    const list = [];
    for (let i = 0; i < history.length; i++) {
        const record = history[i];

        if (userName && record.userName !== userName) {
            continue;
        }
        if (outcome && record.outcome !== outcome) {
            continue;
        }
        list.push(record);
    }

    return res.json({ success: true, history: list });
});

resetHistory();

module.exports = {
    router: router,
    history: history,
    recordEntry: recordEntry,
    resetHistory: resetHistory,
    OUTCOMES: OUTCOMES
};
