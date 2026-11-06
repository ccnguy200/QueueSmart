// Service Management Module
// Lets an administrator create, update, and list services (persisted in SQLite)
const express = require('express');
const router = express.Router();
const { Service, Queue } = require('../tables');

// Longest service name and description we accept
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

// Largest queue size a service can have (people)
const MAX_QUEUE_SIZE = 200;

// The priority levels a service can have
const PRIORITY_LEVELS = ["Low", "Medium", "High"];

// Seed the three mock services if the table is empty (used on startup and in tests)
async function seedServices() {
    const count = await Service.count();
    if (count === 0) {
        const services = await Service.bulkCreate([
            { name: "Academic Advising", description: "Talk to an advisor about course selection.", date: "2026-10-26", time: "09:00", duration: 30, maxSize: 10, priority: "High", open: true },
            { name: "Financial Aid Office", description: "Help with FAFSA, scholarships, and aid questions.", date: "2026-11-26", time: "12:00", duration: 15, maxSize: 8, priority: "Medium", open: true },
            { name: "Tutoring Services", description: "One-on-one tutoring for selected courses.", date: "2026-11-05", time: "02:00", duration: 5, maxSize: 5, priority: "Low", open: true }
        ]);
        // Give every seeded service an open queue row
        for (let i = 0; i < services.length; i++) {
            await Queue.create({ serviceId: services[i].id, status: "open" });
        }
    }
}

// Check a service's fields
// Returns an error message, or "" if everything is fine
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

// true if a service's queue is open (unknown services count as open)
async function isServiceOpen(serviceName) {
    const service = await Service.findOne({ where: { name: serviceName } });
    if (service === null) {
        return true;
    }
    return service.open !== false;
}

// A service's expected duration in minutes (default 15 for unknown services)
async function serviceDuration(serviceName) {
    const service = await Service.findOne({ where: { name: serviceName } });
    if (service === null) {
        return 15;
    }
    return service.duration;
}

// route: list every service
router.get('/', async function (req, res) {
    try {
        const services = await Service.findAll({ order: [['id', 'ASC']] });
        return res.json({ success: true, services: services });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: get a single service by id
router.get('/:id', async function (req, res) {
    try {
        const service = await Service.findByPk(Number(req.params.id));
        if (service === null) {
            return res.status(404).json({ success: false, message: "Service not found." });
        }
        return res.json({ success: true, service: service });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: create a service
router.post('/', async function (req, res) {
    const name = req.body.name;
    const description = req.body.description;
    const date = req.body.date;
    const time = req.body.time;
    const duration = req.body.duration;
    const maxSize = req.body.maxSize;
    const priority = req.body.priority;

    const error = checkService(name, description, date, time, duration, maxSize, priority);
    if (error !== "") {
        return res.status(400).json({ success: false, message: error });
    }

    try {
        const service = await Service.create({
            name: String(name).trim(),
            description: String(description).trim(),
            date: String(date).trim(),
            time: String(time).trim(),
            duration: Number(duration),
            maxSize: Number(maxSize),
            priority: priority,
            open: true
        });
        // Every service gets its own queue row (starts open)
        await Queue.create({ serviceId: service.id, status: "open" });
        return res.status(201).json({ success: true, message: "Service created.", service: service });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: update a service
router.put('/:id', async function (req, res) {
    const id = Number(req.params.id);

    const name = req.body.name;
    const description = req.body.description;
    const date = req.body.date;
    const time = req.body.time;
    const duration = req.body.duration;
    const maxSize = req.body.maxSize;
    const priority = req.body.priority;

    const error = checkService(name, description, date, time, duration, maxSize, priority);
    if (error !== "") {
        return res.status(400).json({ success: false, message: error });
    }

    try {
        const service = await Service.findByPk(id);
        if (service === null) {
            return res.status(404).json({ success: false, message: "Service not found." });
        }

        service.name = String(name).trim();
        service.description = String(description).trim();
        service.date = String(date).trim();
        service.time = String(time).trim();
        service.duration = Number(duration);
        service.maxSize = Number(maxSize);
        service.priority = priority;
        await service.save();

        return res.json({ success: true, message: "Service updated.", service: service });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: delete a service
router.delete('/:id', async function (req, res) {
    try {
        const service = await Service.findByPk(Number(req.params.id));
        if (service === null) {
            return res.status(404).json({ success: false, message: "Service not found." });
        }
        await service.destroy();
        return res.json({ success: true, message: "Service deleted.", service: service });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: open a service's queue (lets users join again)
router.post('/:id/open', async function (req, res) {
    try {
        const service = await Service.findByPk(Number(req.params.id));
        if (service === null) {
            return res.status(404).json({ success: false, message: "Service not found." });
        }
        service.open = true;
        await service.save();
        await Queue.update({ status: "open" }, { where: { serviceId: service.id } });
        return res.json({ success: true, message: "Service queue opened.", service: service });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

// route: close a service's queue (stops new users from joining)
router.post('/:id/close', async function (req, res) {
    try {
        const service = await Service.findByPk(Number(req.params.id));
        if (service === null) {
            return res.status(404).json({ success: false, message: "Service not found." });
        }
        service.open = false;
        await service.save();
        await Queue.update({ status: "closed" }, { where: { serviceId: service.id } });
        return res.json({ success: true, message: "Service queue closed.", service: service });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

module.exports = {
    router: router,
    Service: Service,
    checkService: checkService,
    isServiceOpen: isServiceOpen,
    serviceDuration: serviceDuration,
    seedServices: seedServices,
    PRIORITY_LEVELS: PRIORITY_LEVELS
};
