// Service Management Module
// Lets an administrator create, update, and list services
// Note: no database yet, services are kept in memory while the server is running
const express = require('express');
const router = express.Router();

// Longest service name and description we accept
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

// Largest queue size a service can have (people)
const MAX_QUEUE_SIZE = 200;

// The priority levels a service can have
const PRIORITY_LEVELS = ["Low", "Medium", "High"];

// In-memory storage: every service the administrator has made
let services = [];

// Id for the next service
let nextId = 1;

// Mock data: the services from the A2 Service Management screen
function addMockServices() {
    // *** Added date and time ***
    const mock = [
        { name: "Academic Advising", description: "Talk to an advisor about course selection.", date: "2026-10-26", time: "09:00", duration: 30, maxSize: 10, priority: "High", open: true },
        { name: "Financial Aid Office", description: "Help with FAFSA, scholarships, and aid questions.", date: "2026-11-26", time: "12:00", duration: 15, maxSize: 8, priority: "Medium", open: true },
        { name: "Tutoring Services", description: "One-on-one tutoring for selected courses.", date: "2026-11-05", time: "02:00", duration: 5, maxSize: 5, priority: "Low", open: true }
    ];

    for (let i = 0; i < mock.length; i++) {
        services.push({
            id: nextId,
            name: mock[i].name,
            description: mock[i].description,
            // *** Added date and time ***
            date: mock[i].date,
            time: mock[i].time,
            duration: mock[i].duration,
            maxSize: mock[i].maxSize,
            priority: mock[i].priority,
            open: mock[i].open
        });
        nextId++;
    }
}

// Start over with only the mock services (also used by the unit tests)
// Note: the array is cleared in place so the exported reference stays valid
function resetServices() {
    services.length = 0;
    nextId = 1;
    addMockServices();
}

// Check a service's fields
// Returns an error message, or "" if everything is fine
// *** Added date and time ***
function checkService(name, description, date, time, duration, maxSize, priority) {
    if (name === undefined || name === null || String(name).trim() === "") {
        return "Service name is required.";
    }
    if (String(name).length > MAX_NAME_LENGTH) {
        return "Service name must be " + MAX_NAME_LENGTH + " characters or less.";
    }
    if (description === undefined || description === null || String(description).trim() === "") {
        return "Description is required.";
    }
    if (String(description).length > MAX_DESCRIPTION_LENGTH) {
        return "Description must be " + MAX_DESCRIPTION_LENGTH + " characters or less.";
    }
    if (duration === undefined || duration === null || duration === "" || isNaN(Number(duration))) {
        return "Expected duration must be a number.";
    }
    if (Number(duration) < 1 || Number(duration) > 480) {
        return "Expected duration must be between 1 and 480 minutes.";
    }
    if (maxSize === undefined || maxSize === null || maxSize === "" || isNaN(Number(maxSize))) {
        return "Max queue size must be a number.";
    }
    if (Number(maxSize) < 1 || Number(maxSize) > MAX_QUEUE_SIZE || Math.floor(Number(maxSize)) !== Number(maxSize)) {
        return "Max queue size must be a whole number between 1 and " + MAX_QUEUE_SIZE + ".";
    }
    if (PRIORITY_LEVELS.indexOf(priority) === -1) {
        return "Priority must be Low, Medium, or High.";
    }
    // *** Added date and time ***
    if (date === undefined || date === null || String(date).trim() === "") {
        return "Scheduled date is required.";
    }
    const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!datePattern.test(String(date).trim())) {
        return "Scheduled date must be YYYY-MM-DD.";
    }
    if (time === undefined || time === null || String(time).trim() === "") {
        return "Scheduled time is required.";
    }
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(String(time).trim())) {
        return "Scheduled time must be HH:MM.";
    }
    return "";
}

// Find a service by id, or return null
function findService(id) {
    for (let i = 0; i < services.length; i++) {
        if (services[i].id === id) {
            return services[i];
        }
    }
    return null;
}

// true if a service's queue is open (unknown services count as open)
function isServiceOpen(serviceName) {
    for (let i = 0; i < services.length; i++) {
        if (services[i].name === serviceName) {
            return services[i].open !== false;
        }
    }
    return true;
}

// route: list every service
router.get('/', function (req, res) {
    return res.json({ success: true, services: services });
});

// route: get a single service by id
router.get('/:id', function (req, res) {
    const id = Number(req.params.id);
    const service = findService(id);

    if (service === null) {
        return res.status(404).json({ success: false, message: "Service not found." });
    }

    return res.json({ success: true, service: service });
});

// route: create a service
router.post('/', function (req, res) {
    const name = req.body.name;
    const description = req.body.description;
    // *** Added date and time ***
    const date = req.body.date;
    const time = req.body.time;
    const duration = req.body.duration;
    const maxSize = req.body.maxSize;
    const priority = req.body.priority;

    // *** Added date and time ***
    const error = checkService(name, description, date, time, duration, maxSize, priority);
    if (error !== "") {
        return res.status(400).json({ success: false, message: error });
    }

    const service = {
        id: nextId,
        name: String(name).trim(),
        description: String(description).trim(),
        // *** Added date and time ***
        date: String(date).trim(),        
        time: String(time).trim(),        
        duration: Number(duration),
        maxSize: Number(maxSize),
        priority: priority,
        open: true
    };
    nextId++;
    services.push(service);

    return res.status(201).json({ success: true, message: "Service created.", service: service });
});

// route: update a service
router.put('/:id', function (req, res) {
    const id = Number(req.params.id);
    const service = findService(id);

    if (service === null) {
        return res.status(404).json({ success: false, message: "Service not found." });
    }

    const name = req.body.name;
    const description = req.body.description;
    // *** Added date and time ***
    const date = req.body.date;
    const time = req.body.time;
    const duration = req.body.duration;
    const maxSize = req.body.maxSize;
    const priority = req.body.priority;

    // *** Added date and time ***
    const error = checkService(name, description, date, time, duration, maxSize, priority);
    if (error !== "") {
        return res.status(400).json({ success: false, message: error });
    }

    service.name = String(name).trim();
    service.description = String(description).trim();
    // *** Added date and time ***
    service.date = String(date).trim();
    service.time = String(time).trim(); 
    service.duration = Number(duration);
    service.maxSize = Number(maxSize);
    service.priority = priority;

    return res.json({ success: true, message: "Service updated.", service: service });
});

// route: delete a service
router.delete('/:id', function (req, res) {
    const id = Number(req.params.id);

    for (let i = 0; i < services.length; i++) {
        if (services[i].id === id) {
            const removed = services.splice(i, 1)[0];
            return res.json({ success: true, message: "Service deleted.", service: removed });
        }
    }

    return res.status(404).json({ success: false, message: "Service not found." });
});

// route: open a service's queue (lets users join again)
router.post('/:id/open', function (req, res) {
    const id = Number(req.params.id);
    const service = findService(id);

    if (service === null) {
        return res.status(404).json({ success: false, message: "Service not found." });
    }

    service.open = true;
    return res.json({ success: true, message: "Service queue opened.", service: service });
});

// route: close a service's queue (stops new users from joining)
router.post('/:id/close', function (req, res) {
    const id = Number(req.params.id);
    const service = findService(id);

    if (service === null) {
        return res.status(404).json({ success: false, message: "Service not found." });
    }

    service.open = false;
    return res.json({ success: true, message: "Service queue closed.", service: service });
});

resetServices();

module.exports = {
    router: router,
    services: services,
    checkService: checkService,
    resetServices: resetServices,
    isServiceOpen: isServiceOpen,
    PRIORITY_LEVELS: PRIORITY_LEVELS
};
