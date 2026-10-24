// Added export
const express = require('express');
const router = express.Router();
const notifications = require('./notifications');
const { isServiceOpen, services } = require('./services');
const history = require('./history');

// In-memory storage: will hold active queues while server is running
const activeQueue = [];

// wait-time estimation logic: rule based (position * expected duration)
// The duration is read from the services module so edits made in Service
// Management automatically apply to the wait-time estimates here too
function serviceDuration(serviceName) {
    for (let i = 0; i < services.length; i++) {
        if (services[i].name === serviceName) {
            return services[i].duration;
        }
    }
    return 15;
}

// check if API is working, will also return curr queue items
router.get('/', (req, res) => {
    res.json({message: "Queue API is working", queue: activeQueue});
});

// route: joining queue
// will add user to specified service queue, dtermine their position, and calculate the estimated wait time
router.post('/join', (req, res) => {
    // extraxt data sent in fron front-end
    const {userName, service, queueDate, queueTime, cardName, cardNumber, expDate, cvv} = req.body;

    // verify all required inputs were given
    if (!service || !queueDate || !queueTime || !cardName || !cardNumber || !expDate || !cvv) {
        return res.status(400).json({ 
            success: false, 
            message: "Missing required fields." 
        });
    }

    // validate the types and formats of the inputs
    if (!/^\d{16}$/.test(cardNumber)) {
        return res.status(400).json({ success: false, message: "Card number must be 16 digits." });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(queueDate)) {
        return res.status(400).json({ success: false, message: "Queue date must be in YYYY-MM-DD format." });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(queueTime)) {
        return res.status(400).json({ success: false, message: "Queue time must be in HH:MM format." });
    }
    if (!/^\d{2}\/\d{2}$/.test(expDate)) {
        return res.status(400).json({ success: false, message: "Expiry date must be in MM/YY format." });
    }
    if (!/^\d{3}$/.test(cvv)) {
        return res.status(400).json({ success: false, message: "CVV must be 3 digits." });
    }

    // stop new joins when the service queue is closed
    if (!isServiceOpen(service)) {
        return res.status(400).json({
            success: false,
            message: "This service queue is currently closed."
        });
    }

    // determine estimated duration for service (default will be 15)
    const duration = serviceDuration(service);

    // count num people curr in specific service queue
    let waitingCount = 0;
    for (let i = 0; i < activeQueue.length; i++) {
        if (activeQueue[i].service === service && activeQueue[i].status === "waiting") {
            waitingCount++;
        }
    }

    // update user's position based on curr wait count
    const position = waitingCount + 1;

    // determine estimated wait time 
    const estimatedWaitTime = (position - 1) * duration;

    // create new user entry to add into queue
    // user will be given unique ID
    const userEntry = {
        id: "Q-" + Date.now(),            
        userName: userName || "Unknown", 
        service: service,
        queueDate: queueDate,
        queueTime: queueTime,
        position: position,
        estimatedWaitTime: estimatedWaitTime,
        status: "waiting"
    };

    // push new user entry into active queue array
    activeQueue.push(userEntry);

    // send notifications: user joined the queue + anyone close to being served
    notifications.notifyJoined(userEntry);
    notifications.checkQueue(activeQueue);

    // return response once created along w/ updated queue data
    return res.status(201).json({
        success: true,
        message: "Successfully joined queue.",
        data: userEntry
    });
});

// route: leaving queue
// will remove user from queue if user decides to cancel and leave spot
router.post('/leave', (req, res) => {
    // extraxt queue id
    const { queueId } = req.body

    // check to see if queue id was provided
    if (!queueId) {
        return res.status(400).json({
            success: false,
            message: "Queue ID is required."
        });
    }

    // iterate through array and match entry
    for (let j = 0; j < activeQueue.length; j++) {
        if (activeQueue[j].id === queueId) {
            const removed = activeQueue.splice(j, 1)[0];

            // update position + wait time for everyone still waiting in the same service
            const duration = serviceDuration(removed.service);
            let newPosition = 1;
            for (let k = 0; k < activeQueue.length; k++) {
                if (activeQueue[k].service === removed.service && activeQueue[k].status === "waiting") {
                    activeQueue[k].position = newPosition;
                    activeQueue[k].estimatedWaitTime = (newPosition - 1) * duration;
                    newPosition++;
                }
            }

            // send notifications: anyone who is now close to being served
            notifications.checkQueue(activeQueue);

            // record the leave in the history module
            history.recordEntry(removed.userName, removed.service, "Left Queue", removed.estimatedWaitTime);
            
            return res.status(200).json({
                success: true,
                message: "Left queue successfully.",
                data: removed
            });
        }
    }

    // return message if no match was found for queue id
    return res.status(404).json({ 
        success: false, 
        message: "Entry was not found." 
    });
});

// route: get queue status
// will retrive all active queue entries
router.get('/status', (req, res) => {
    return res.status(200).json({ 
        success: true, 
        queue: activeQueue 
    });
});

// route: reschedule an appointment
// will update date and time for an existing appt
router.put('/reschedule', (req, res) => {
    // extract queueId for target, newDate, and newTime from request
    const { queueId, newDate, newTime } = req.body;

    // check to see if queueId, newDate, and newTime were provided
    if (!queueId || !newDate || !newTime) {
        return res.status(400).json({
            success: false,
            message: "Missing required information to reschedule."
        });
    }

    // iterate through arr, match target entry, and update date and tine
    for (let m = 0; m < activeQueue.length; m++) {
        if (activeQueue[m].id === queueId) {
            activeQueue[m].queueDate = newDate;
            activeQueue[m].queueTime = newTime;

            // return message after appt rescheduled successfully
            return res.status(200).json({
                success: true,
                message: "Appointment was rescheduled successfully.",
                data: activeQueue[m]
            });
        }
    }

    // return message if no match was found
    return res.status(404).json({
        success: false,
        message: "Entry was not found."
    });
});

// route: cancel an appointment
// will set target appt status as 'canceled'
router.put('/cancel', (req, res) => {
    // extract queue id
    const { queueId } = req.body;

    // check to see if queue id was provided
    if (!queueId) {
        return res.status(400).json({
            success: false,
            message: "Missing Queue ID to cancel Appointment."
        });
    }

    // iterate through arr, match entry, and set status to 'Canceled'
    for (let n = 0; n < activeQueue.length; n++) {
        if (activeQueue[n].id === queueId) {
            activeQueue[n].status = "Canceled";

            // return message after appt canceled successfully
            return res.status(200).json({
                success: true,
                message: "Appointment was canceled successfully.",
                data: activeQueue[n]
            });
        }
    }

    // return message if no match was found
    return res.status(404).json({
        success: false,
        message: "Entry was not found."
    });
});

// export router + activeQueue + serviceDuration to give access to unit tests and server.js
module.exports = {router, activeQueue, serviceDuration};
