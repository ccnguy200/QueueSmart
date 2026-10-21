// Unit tests for the Service Management module
const request = require('supertest');
const app = require('../server');
const { services, resetServices } = require('../routes/services');

describe('Service Management Module', function () {
    beforeEach(function () {
        resetServices();
    });

    test('starts with the three mock services', async function () {
        const res = await request(app).get('/api/services');
        expect(res.statusCode).toBe(200);
        expect(res.body.services.length).toBe(3);
    });

    test('creates a valid service', async function () {
        const res = await request(app).post('/api/services').send({
            name: "Career Center",
            description: "Resume and interview help.",
            // ** Added date and time below ***
            date: "2026-10-15",
            time: "10:00",
            duration: 20,
            maxSize: 15,
            priority: "Medium"
        });
        expect(res.statusCode).toBe(201);
        expect(res.body.service.name).toBe("Career Center");
        // *** Added date and time below ***
        expect(res.body.service.date).toBe("2026-10-15");
        expect(res.body.service.time).toBe("10:00");
        expect(services.length).toBe(4);
    });

    test('rejects a service with no name', async function () {
        const res = await request(app).post('/api/services').send({
            description: "No name here.",
            duration: 20,
            maxSize: 15,
            priority: "Low"
        });
        expect(res.statusCode).toBe(400);
    });

    test('rejects a name longer than 100 characters', async function () {
        const res = await request(app).post('/api/services').send({
            name: "x".repeat(101),
            description: "Too long.",
            duration: 20,
            maxSize: 15,
            priority: "Low"
        });
        expect(res.statusCode).toBe(400);
    });

    test('rejects a duration outside 1-480', async function () {
        const res = await request(app).post('/api/services').send({
            name: "Test", description: "Desc", duration: 0, maxSize: 15, priority: "Low"
        });
        expect(res.statusCode).toBe(400);
    });

    test('rejects a max queue size outside 1-200', async function () {
        const res = await request(app).post('/api/services').send({
            name: "Test", description: "Desc", duration: 10, maxSize: 300, priority: "Low"
        });
        expect(res.statusCode).toBe(400);
    });

    test('rejects a fractional max queue size', async function () {
        const res = await request(app).post('/api/services').send({
            name: "Test", description: "Desc", duration: 10, maxSize: 3.5, priority: "Low"
        });
        expect(res.statusCode).toBe(400);
    });

    test('rejects an invalid priority level', async function () {
        const res = await request(app).post('/api/services').send({
            name: "Test", description: "Desc", duration: 10, maxSize: 15, priority: "Urgent"
        });
        expect(res.statusCode).toBe(400);
    });

    test('updates an existing service', async function () {
        const res = await request(app).put('/api/services/1').send({
            name: "Academic Advising",
            description: "Updated description.",
            // *** Date and time added here ***
            date: "2026-11-01",
            time: "09:30",
            duration: 40,
            maxSize: 10,
            priority: "High"
        });
        expect(res.statusCode).toBe(200);
        expect(services[0].duration).toBe(40);
        // *** Date added below ***
        expect(services[0].date).toBe("2026-11-01");
    });

    test('returns 404 when updating a missing service', async function () {
        const res = await request(app).put('/api/services/999').send({
            // *** Added date and time below ***
            name: "X", description: "Y", date: "2026-10-15", time: "10:00", duration: 10, maxSize: 10, priority: "Low"
        });
        expect(res.statusCode).toBe(404);
    });

    test('deletes a service', async function () {
        const res = await request(app).delete('/api/services/1');
        expect(res.statusCode).toBe(200);
        expect(services.length).toBe(2);
    });

    test('returns 404 when deleting a missing service', async function () {
        const res = await request(app).delete('/api/services/999');
        expect(res.statusCode).toBe(404);
    });

    test('gets a single service by id', async function () {
        const res = await request(app).get('/api/services/1');
        expect(res.statusCode).toBe(200);
        expect(res.body.service.name).toBe("Academic Advising");
    });

    test('returns 404 when getting a missing service', async function () {
        const res = await request(app).get('/api/services/999');
        expect(res.statusCode).toBe(404);
    });

    test('closes a service queue', async function () {
        const res = await request(app).post('/api/services/1/close');
        expect(res.statusCode).toBe(200);
        expect(res.body.service.open).toBe(false);
    });

    test('opens a service queue again', async function () {
        await request(app).post('/api/services/1/close');
        const res = await request(app).post('/api/services/1/open');
        expect(res.statusCode).toBe(200);
        expect(res.body.service.open).toBe(true);
    });

    // *** Added tests for calendar/ date+time addition ***
    test('rejects a service with no date', async function () {
    const res = await request(app).post('/api/services').send({
        name: "Test", description: "Desc",
        time: "10:00",
        duration: 10, maxSize: 15, priority: "Low"
    });
    expect(res.statusCode).toBe(400);
});

    test('rejects a service with no time', async function () {
        const res = await request(app).post('/api/services').send({
            name: "Test", description: "Desc",
            date: "2026-10-15",
            duration: 10, maxSize: 15, priority: "Low"
        });
        expect(res.statusCode).toBe(400);
    });

    test('rejects a service with an invalid date format', async function () {
        const res = await request(app).post('/api/services').send({
            name: "Test", description: "Desc",
            date: "15/10/2026", time: "10:00",
            duration: 10, maxSize: 15, priority: "Low"
        });
        expect(res.statusCode).toBe(400);
    });

    test('rejects a service with an invalid time format', async function () {
        const res = await request(app).post('/api/services').send({
            name: "Test", description: "Desc",
            date: "2026-10-15", time: "25:99",
            duration: 10, maxSize: 15, priority: "Low"
        });
        expect(res.statusCode).toBe(400);
    });
});
