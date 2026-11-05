// Queue Management Module (Admin side)
// Lets an administrator view the queue, serve the next user, and reorder users
// (persisted in SQLite via the QueueEntry table)
const express = require('express');
const router = express.Router();

const { Service, QueueEntry } = require('../tables');
const { serviceDuration } = require('./services');
const history = require('./history');
const notifications = require('./notifications');

// Higher number = higher priority (used when deciding who to serve next)
const PRIORITY_ORDER = { "High": 3, "Medium": 2, "Low": 1 };

// A service's priority by name (defaults to Medium)
async function priorityOf(serviceName) {
    const service = await Service.findOne({ where: { name: serviceName } });
    return service ? service.priority : "Medium";
}

// The first waiting entry for a service (arrival order), or null
async function frontEntryOf(service) {
    const entries = await QueueEntry.findAll({
        where: { service: service, status: "waiting" },
        order: [['position', 'ASC'], ['createdAt', 'ASC']]
    });
    return entries.length > 0 ? entries[0] : null;
}

// Decide which service to serve next
// If requestedService is given, use it. Otherwise pick the highest-priority
// service that has someone waiting.
async function nextServiceToServe(requestedService) {
    if (requestedService) {
        return requestedService;
    }

    const entries = await QueueEntry.findAll({ where: { status: "waiting" } });

    let bestService = null;
    let bestPriority = 0;
    const seen = [];

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (seen.indexOf(entry.service) !== -1) {
            continue;
        }
        seen.push(entry.service);

        const priority = PRIORITY_ORDER[await priorityOf(entry.service)] || 2;
        if (priority > bestPriority) {
            bestPriority = priority;
            bestService = entry.service;
        }
    }

    return bestService;
}

// Re-number the positions and wait times for everyone waiting in one service
async function recalculate(service) {
    const entries = await QueueEntry.findAll({
        where: { service: service, status: "waiting" },
        order: [['position', 'ASC'], ['createdAt', 'ASC']]
    });

    const duration = await serviceDuration(service);
    for (let i = 0; i < entries.length; i++) {
        entries[i].position = i + 1;
        entries[i].estimatedWaitTime = i * duration;
        await entries[i].save();
    }
}

// route: view the current queue
router.get('/', async function (req, res) {
    try {
        const queue = await QueueEntry.findAll();
        return res.json({ success: true, queue: queue });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: serve the next user
// Optional body.service: serve that service's front; otherwise the highest-priority one
router.post('/serve', async function (req, res) {
    try {
        const service = await nextServiceToServe(req.body.service);
        if (service === null) {
            return res.status(404).json({ success: false, message: "No one is waiting in the queue." });
        }

        const entry = await frontEntryOf(service);
        if (entry === null) {
            return res.status(404).json({ success: false, message: "No one is waiting in the queue." });
        }

        await entry.destroy();
        await history.recordEntry(entry.userName, entry.service, "Served", entry.estimatedWaitTime);
        await recalculate(service);

        if (notifications && typeof notifications.checkQueue === 'function') {
            const activeQueue = await QueueEntry.findAll();
            notifications.checkQueue(activeQueue);
        }

        return res.json({
            success: true,
            message: entry.userName + " has been served.",
            user: entry
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: mark the next user as a no-show (they are removed and counted as "Missed")
router.post('/no-show', async function (req, res) {
    try {
        const service = await nextServiceToServe(req.body.service);
        if (service === null) {
            return res.status(404).json({ success: false, message: "No one is waiting in the queue." });
        }

        const entry = await frontEntryOf(service);
        if (entry === null) {
            return res.status(404).json({ success: false, message: "No one is waiting in the queue." });
        }

        await entry.destroy();
        await history.recordEntry(entry.userName, entry.service, "Missed", entry.estimatedWaitTime);
        await recalculate(service);

        if (notifications && typeof notifications.checkQueue === 'function') {
            const activeQueue = await QueueEntry.findAll();
            notifications.checkQueue(activeQueue);
        }

        return res.json({
            success: true,
            message: entry.userName + " was marked as a no-show.",
            user: entry
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: reorder a user up or down within their service's queue
// Body: { queueId, direction } where direction is "up" or "down"
router.post('/reorder', async function (req, res) {
    const queueId = req.body.queueId;
    const direction = req.body.direction;

    if (!queueId) {
        return res.status(400).json({ success: false, message: "Queue ID is required." });
    }
    if (direction !== "up" && direction !== "down") {
        return res.status(400).json({ success: false, message: "Direction must be 'up' or 'down'." });
    }

    try {
        const entry = await QueueEntry.findByPk(queueId);
        if (entry === null) {
            return res.status(404).json({ success: false, message: "Entry was not found." });
        }

        // All waiting entries for this service, in order
        const siblings = await QueueEntry.findAll({
            where: { service: entry.service, status: "waiting" },
            order: [['position', 'ASC'], ['createdAt', 'ASC']]
        });

        let index = -1;
        for (let i = 0; i < siblings.length; i++) {
            if (siblings[i].id === queueId) {
                index = i;
                break;
            }
        }

        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= siblings.length) {
            return res.status(400).json({ success: false, message: "Cannot move further in that direction." });
        }

        // Swap positions
        const tempPos = siblings[index].position;
        siblings[index].position = siblings[target].position;
        siblings[target].position = tempPos;
        await siblings[index].save();
        await siblings[target].save();

        return res.json({ success: true, message: "Queue reordered." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: remove a user from the queue by id (any position)
router.delete('/:id', async function (req, res) {
    const queueId = req.params.id;

    try {
        const entry = await QueueEntry.findByPk(queueId);
        if (entry === null) {
            return res.status(404).json({ success: false, message: "Entry was not found." });
        }

        const service = entry.service;
        await entry.destroy();
        await history.recordEntry(entry.userName, entry.service, "Left Queue", entry.estimatedWaitTime);
        await recalculate(service);

        if (notifications && typeof notifications.checkQueue === 'function') {
            const activeQueue = await QueueEntry.findAll();
            notifications.checkQueue(activeQueue);
        }

        return res.json({ success: true, message: entry.userName + " was removed from the queue.", user: entry });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// *** CALENDAR FUNCTIONALITY --- BEGIN *** (in-memory appointments for the calendar)

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
    appointments: appointments
};
