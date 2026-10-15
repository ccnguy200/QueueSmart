// Service Management Module
// Lets an administrator create, update, and list services
// Note: no database yet, services are kept in memory while the server is running
const express = require('express');
const router = express.Router();

// Longest service name and description we accept
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

// The priority levels a service can have
const PRIORITY_LEVELS = ["Low", "Medium", "High"];

// In-memory storage: every service the administrator has made
let services = [];

// Id for the next service
let nextId = 1;

// Mock data: the services from the A2 Service Management screen
function addMockServices() {
    const mock = [
        { name: "Academic Advising", description: "Talk to an advisor about course selection.", duration: 30, priority: "High" },
        { name: "Financial Aid Office", description: "Help with FAFSA, scholarships, and aid questions.", duration: 15, priority: "Medium" },
        { name: "Tutoring Services", description: "One-on-one tutoring for selected courses.", duration: 5, priority: "Low" }
    ];

    for (let i = 0; i < mock.length; i++) {
        services.push({
            id: nextId,
            name: mock[i].name,
            description: mock[i].description,
            duration: mock[i].duration,
            priority: mock[i].priority
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
function checkService(name, description, duration, priority) {
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
    if (PRIORITY_LEVELS.indexOf(priority) === -1) {
        return "Priority must be Low, Medium, or High.";
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

// route: list every service
router.get('/', function (req, res) {
    return res.json({ success: true, services: services });
});

// route: create a service
router.post('/', function (req, res) {
    const name = req.body.name;
    const description = req.body.description;
    const duration = req.body.duration;
    const priority = req.body.priority;

    const error = checkService(name, description, duration, priority);
    if (error !== "") {
        return res.status(400).json({ success: false, message: error });
    }

    const service = {
        id: nextId,
        name: String(name).trim(),
        description: String(description).trim(),
        duration: Number(duration),
        priority: priority
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
    const duration = req.body.duration;
    const priority = req.body.priority;

    const error = checkService(name, description, duration, priority);
    if (error !== "") {
        return res.status(400).json({ success: false, message: error });
    }

    service.name = String(name).trim();
    service.description = String(description).trim();
    service.duration = Number(duration);
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

resetServices();

module.exports = {
    router: router,
    services: services,
    checkService: checkService,
    resetServices: resetServices,
    PRIORITY_LEVELS: PRIORITY_LEVELS
};
