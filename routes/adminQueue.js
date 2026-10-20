// Queue Management Module (Admin side)
// Lets an administrator view the current queue, serve the next user, and reorder users
// Note: no database yet, the queue is kept in memory while the server is running
const express = require('express');
const router = express.Router();

const { activeQueue, service_Durations } = require('./userQueue');
const { services } = require('./services');
const history = require('./history');
const notifications = require('./notifications');

// Higher number = higher priority (used when deciding who to serve next)
const PRIORITY_ORDER = { "High": 3, "Medium": 2, "Low": 1 };

// Find a service's priority by its name (defaults to Medium)
function priorityOf(serviceName) {
    for (let i = 0; i < services.length; i++) {
        if (services[i].name === serviceName) {
            return services[i].priority;
        }
    }
    return "Medium";
}

// Find the first waiting entry for a service (arrival order), or -1
function frontIndexOf(service) {
    for (let i = 0; i < activeQueue.length; i++) {
        if (activeQueue[i].service === service && activeQueue[i].status === "waiting") {
            return i;
        }
    }
    return -1;
}

// Decide which service to serve next
// If requestedService is given, use it. Otherwise pick the highest-priority
// service that has someone waiting.
function nextServiceToServe(requestedService) {
    if (requestedService) {
        return requestedService;
    }

    let bestService = null;
    let bestPriority = 0;
    const seen = [];

    for (let i = 0; i < activeQueue.length; i++) {
        const entry = activeQueue[i];
        if (entry.status !== "waiting" || seen.indexOf(entry.service) !== -1) {
            continue;
        }
        seen.push(entry.service);

        const priority = PRIORITY_ORDER[priorityOf(entry.service)] || 2;
        if (priority > bestPriority) {
            bestPriority = priority;
            bestService = entry.service;
        }
    }

    return bestService;
}

// Re-number the positions and wait times for everyone waiting in one service
function recalculate(service) {
    const duration = service_Durations[service] || 15;
    let position = 1;

    for (let i = 0; i < activeQueue.length; i++) {
        if (activeQueue[i].service === service && activeQueue[i].status === "waiting") {
            activeQueue[i].position = position;
            activeQueue[i].estimatedWaitTime = (position - 1) * duration;
            position++;
        }
    }
}

// route: view the current queue
router.get('/', function (req, res) {
    return res.json({ success: true, queue: activeQueue });
});

// route: serve the next user
// Optional body.service: serve that service's front; otherwise the highest-priority one
router.post('/serve', function (req, res) {
    const service = nextServiceToServe(req.body.service);

    if (service === null) {
        return res.status(404).json({ success: false, message: "No one is waiting in the queue." });
    }

    const index = frontIndexOf(service);
    if (index === -1) {
        return res.status(404).json({ success: false, message: "No one is waiting in the queue." });
    }

    const served = activeQueue.splice(index, 1)[0];

    // Record the served user in history and update the remaining queue
    history.recordEntry(served.userName, served.service, "Served", served.estimatedWaitTime);
    recalculate(service);
    notifications.checkQueue(activeQueue);

    return res.json({
        success: true,
        message: served.userName + " has been served.",
        user: served
    });
});

// route: mark the next user as a no-show (they are removed and counted as "Missed")
router.post('/no-show', function (req, res) {
    const service = nextServiceToServe(req.body.service);

    if (service === null) {
        return res.status(404).json({ success: false, message: "No one is waiting in the queue." });
    }

    const index = frontIndexOf(service);
    if (index === -1) {
        return res.status(404).json({ success: false, message: "No one is waiting in the queue." });
    }

    const removed = activeQueue.splice(index, 1)[0];
    history.recordEntry(removed.userName, removed.service, "Missed", removed.estimatedWaitTime);
    recalculate(service);
    notifications.checkQueue(activeQueue);

    return res.json({
        success: true,
        message: removed.userName + " was marked as a no-show.",
        user: removed
    });
});

// route: reorder a user up or down within their service's queue
// Body: { queueId, direction } where direction is "up" or "down"
router.post('/reorder', function (req, res) {
    const queueId = req.body.queueId;
    const direction = req.body.direction;

    if (!queueId) {
        return res.status(400).json({ success: false, message: "Queue ID is required." });
    }
    if (direction !== "up" && direction !== "down") {
        return res.status(400).json({ success: false, message: "Direction must be 'up' or 'down'." });
    }

    let index = -1;
    for (let i = 0; i < activeQueue.length; i++) {
        if (activeQueue[i].id === queueId) {
            index = i;
            break;
        }
    }
    if (index === -1) {
        return res.status(404).json({ success: false, message: "Entry was not found." });
    }

    const entry = activeQueue[index];
    const service = entry.service;

    // Find the waiting neighbour to swap with (same service)
    let target = -1;
    if (direction === "up") {
        for (let i = index - 1; i >= 0; i--) {
            if (activeQueue[i].service === service && activeQueue[i].status === "waiting") {
                target = i;
                break;
            }
        }
    } else {
        for (let i = index + 1; i < activeQueue.length; i++) {
            if (activeQueue[i].service === service && activeQueue[i].status === "waiting") {
                target = i;
                break;
            }
        }
    }

    if (target === -1) {
        return res.status(400).json({ success: false, message: "Cannot move further in that direction." });
    }

    // Swap the two entries and fix the positions
    const temp = activeQueue[index];
    activeQueue[index] = activeQueue[target];
    activeQueue[target] = temp;

    recalculate(service);

    return res.json({ success: true, message: "Queue reordered.", queue: activeQueue });
});

// route: remove a user from the queue by id (any position)
router.delete('/:id', function (req, res) {
    const queueId = req.params.id;

    let index = -1;
    for (let i = 0; i < activeQueue.length; i++) {
        if (activeQueue[i].id === queueId) {
            index = i;
            break;
        }
    }

    if (index === -1) {
        return res.status(404).json({ success: false, message: "Entry was not found." });
    }

    const removed = activeQueue.splice(index, 1)[0];
    history.recordEntry(removed.userName, removed.service, "Left Queue", removed.estimatedWaitTime);
    recalculate(removed.service);
    notifications.checkQueue(activeQueue);

    return res.json({ success: true, message: removed.userName + " was removed from the queue.", user: removed });
});

// *** CALENDAR FUNCTIONALITY --- BEGIN ***

const appointments = [
    { id: "appt1", date: "2026-10-26", time: "09:00", title: "Academic Advising",   service: "Academic Advising" },
    { id: "appt2", date: "2026-11-26", time: "12:00", title: "Financial Aid Office", service: "Financial Aid Office" },
    { id: "appt3", date: "2026-11-05", time: "02:00", title: "Tutoring Services",    service: "Tutoring Services" }
];

router.get('/appointments', function (req, res) {
    return res.json({ success: true, appointments: appointments });
});

router.post('/appointments', function (req, res) {
    const date = String(req.body.date || "").trim();
    const time = String(req.body.time || "").trim();
    const title = String(req.body.title || "").trim();
    const service = String(req.body.service || "").trim();

    if (!date || !time || !title) {
        return res.status(400).json({ success: false, message: "Missing date, time, or title." });
    }
    if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {
        return res.status(400).json({ success: false, message: "Date must be YYYY-MM-DD." });
    }
    if (!/^\d{1,2}:\d{2}$/.test(time)) {
        return res.status(400).json({ success: false, message: "Time must be HH:MM." });
    }

    const entry = {
        id: "appt" + Date.now(),
        date: date,
        time: time,
        title: title,
        service: service
    };
    
    appointments.push(entry);
    return res.json({ success: true, appointment: entry });
});

// *** CALENDAR FUNCTIONALITY --- END ***

module.exports = {
    router: router,
    priorityOf: priorityOf,
    nextServiceToServe: nextServiceToServe,
    recalculate: recalculate,
    PRIORITY_ORDER: PRIORITY_ORDER,
    // *** Added calendar export here ***
    appointments: appointments
};
