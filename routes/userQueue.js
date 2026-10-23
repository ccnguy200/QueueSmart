// Added export
const express = require('express');
const router = express.Router();
const notifications = require('./notifications');
const { isServiceOpen } = require('./services');
const { QueueEntry } = require('../tables');

// wait-time estimation logic
// rule based: position * expected duration
const service_Durations = {
    "Academic Advising": 30,
    "Financial Aid Office": 24,
    "Tutoring Services": 5
};

// check if API is working, will also return curr queue items
router.get('/', async (req, res) => {
    try {
        const activeQueue = await QueueEntry.findAll();
        res.json({ message: "Queue API is working", queue: activeQueue });
    } catch (err) {
        res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: joining queue
// will add user to specified service queue, dtermine their position, and calculate the estimated wait time
router.post('/join', async (req, res) => {
    // extraxt data sent in fron front-end
    const {userName, service, queueDate, queueTime, cardName, cardNumber, expDate, cvv} = req.body;

    // verify all required inputs were given
    if (!service || !queueDate || !queueTime || !cardName || !cardNumber || !expDate || !cvv) {
        return res.status(400).json({ 
            success: false, 
            message: "Missing required fields." 
        });
    }

    // stop new joins when the service queue is closed
    if (typeof isServiceOpen === 'function' && !isServiceOpen(service)) {
        return res.status(400).json({
            success: false,
            message: "This service queue is currently closed."
        });
    }

    // determine estimated duration for service (default will be 15)
    const duration = service_Durations[service] || 15;

    try {
        // count num people curr in specific service queue
        const waitingCount = await QueueEntry.count({
            where: { service: service, status: "waiting" }
        });

        // update user's position based on curr wait count
        const position = waitingCount + 1;

        // determine estimated wait time 
        const estimatedWaitTime = (position - 1) * duration;

        // create new user entry to add into queue
        const userEntry = await QueueEntry.create({
            userName: userName || "Unknown",
            service: service,
            queueDate: queueDate,
            queueTime: queueTime,
            position: position,
            estimatedWaitTime: estimatedWaitTime,
            status: "waiting"
        });

        // send notifications: user joined the queue + anyone close to being served
        if (notifications) {
            const activeQueue = await QueueEntry.findAll();
            if (typeof notifications.notifyJoined === 'function') notifications.notifyJoined(userEntry);
            if (typeof notifications.checkQueue === 'function') notifications.checkQueue(activeQueue);
        }

        // return response once created along w/ updated queue data
        return res.status(201).json({
            success: true,
            message: "Successfully joined queue.",
            data: userEntry
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: leaving queue
// will remove user from queue if user decides to cancel and leave spot
router.post('/leave', async (req, res) => {
    // extraxt queue id
    const { queueId } = req.body;

    // check to see if queue id was provided
    if (!queueId) {
        return res.status(400).json({
            success: false,
            message: "Queue ID is required."
        });
    }

    try {
        const entry = await QueueEntry.findByPk(queueId);
        if (!entry) {
            return res.status(404).json({ 
                success: false, 
                message: "Entry was not found." 
            });
        }

        const removedService = entry.service;
        await entry.destroy();

        // update position + wait time for everyone still waiting in the same service
        const remainingWaiting = await QueueEntry.findAll({
            where: { service: removedService, status: "waiting" },
            order: [['createdAt', 'ASC']]
        });

        const duration = service_Durations[removedService] || 15;
        for (let k = 0; k < remainingWaiting.length; k++) {
            const newPos = k + 1;
            remainingWaiting[k].position = newPos;
            remainingWaiting[k].estimatedWaitTime = (newPos - 1) * duration;
            await remainingWaiting[k].save();
        }

        // send notifications: anyone who is now close to being served
        if (notifications && typeof notifications.checkQueue === 'function') {
            const activeQueue = await QueueEntry.findAll();
            notifications.checkQueue(activeQueue);
        }

        return res.status(200).json({
            success: true,
            message: "Left queue successfully.",
            data: entry
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: get queue status
// will retrive all active queue entries
router.get('/status', async (req, res) => {
    try {
        const activeQueue = await QueueEntry.findAll();
        return res.status(200).json({ 
            success: true, 
            queue: activeQueue 
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: reschedule an appointment
// will update date and time for an existing appt
router.put('/reschedule', async (req, res) => {
    // extract queueId for target, newDate, and newTime from request
    const { queueId, newDate, newTime } = req.body;

    // check to see if queueId, newDate, and newTime were provided
    if (!queueId || !newDate || !newTime) {
        return res.status(400).json({
            success: false,
            message: "Missing required information to reschedule."
        });
    }

    try {
        const entry = await QueueEntry.findByPk(queueId);
        if (!entry) {
            return res.status(404).json({
                success: false,
                message: "Entry was not found."
            });
        }

        entry.queueDate = newDate;
        entry.queueTime = newTime;
        await entry.save();

        // return message after appt rescheduled successfully
        return res.status(200).json({
            success: true,
            message: "Appointment was rescheduled successfully.",
            data: entry
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: cancel an appointment
// will set target appt status as 'canceled'
router.put('/cancel', async (req, res) => {
    // extract queue id
    const { queueId } = req.body;

    // check to see if queue id was provided
    if (!queueId) {
        return res.status(400).json({
            success: false,
            message: "Missing Queue ID to cancel Appointment."
        });
    }

    try {
        const entry = await QueueEntry.findByPk(queueId);
        if (!entry) {
            return res.status(404).json({
                success: false,
                message: "Entry was not found."
            });
        }

        entry.status = "Canceled";
        await entry.save();

        // return message after appt canceled successfully
        return res.status(200).json({
            success: true,
            message: "Appointment was canceled successfully.",
            data: entry
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// export router + service_Durations to give access to unit tests and server.js
module.exports = {router, service_Durations};
