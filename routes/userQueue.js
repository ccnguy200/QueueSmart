// Added export
const express = require('express');
const router = express.Router();

// In-memory storage: will hold active queues while server is running
const activeQueue = [];

// wait-time estimation logic
// rule based: position * expected duration
const service_Durations = {
    "Academic Advising": 30,
    "Financial Aid Office": 24,
    "Tutoring Services": 5
};

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

    // determine estimated duration for service (default will be 15)
    const duration = service_Durations[service] || 15;

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

    // return response once created along w/ updated queue data
    return res.status(201).json({
        success: true,
        message: "Successfully joined queue.",
        data: userEntry
    });
});

// route: leaving queue

module.exports = {router};