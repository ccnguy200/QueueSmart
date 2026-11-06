// Unit tests for the Service Management module (database-backed)
const request = require('supertest');
const app = require('../server');
const { sequelize, Queue } = require('../tables');
const { seedServices } = require('../routes/services');

describe('Service Management Module', function () {
    beforeEach(async () => {
        await sequelize.sync({ force: true });
        await seedServices();
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('starts with the three mock services', async () => {
        const res = await request(app).get('/api/services');
        expect(res.statusCode).toBe(200);
        expect(res.body.services.length).toBe(3);
    });

    test('creates a valid service', async () => {
        const res = await request(app).post('/api/services').send({
            name: "Career Center",
            description: "Resume and interview help.",
            duration: 20,
            maxSize: 15,
            priority: "Medium",
            date: "2026-11-01",
            time: "10:00"
        });
        expect(res.statusCode).toBe(201);
        expect(res.body.service.name).toBe("Career Center");

        const list = await request(app).get('/api/services');
        expect(list.body.services.length).toBe(4);
    });

    test('rejects a service with no name', async () => {
        const res = await request(app).post('/api/services').send({
            description: "No name here.", duration: 20, maxSize: 15,
            priority: "Low", date: "2026-11-01", time: "10:00"
        });
        expect(res.statusCode).toBe(400);
    });

    test('rejects a name longer than 100 characters', async () => {
        const res = await request(app).post('/api/services').send({
            name: "x".repeat(101), description: "Too long.", duration: 20,
            maxSize: 15, priority: "Low", date: "2026-11-01", time: "10:00"
        });
        expect(res.statusCode).toBe(400);
    });

    test('rejects a duration outside 1-480', async () => {
        const res = await request(app).post('/api/services').send({
            name: "Test", description: "Desc", duration: 0, maxSize: 15,
            priority: "Low", date: "2026-11-01", time: "10:00"
        });
        expect(res.statusCode).toBe(400);
    });

    test('rejects a max queue size outside 1-200', async () => {
        const res = await request(app).post('/api/services').send({
            name: "Test", description: "Desc", duration: 10, maxSize: 300,
            priority: "Low", date: "2026-11-01", time: "10:00"
        });
        expect(res.statusCode).toBe(400);
    });

    test('rejects a fractional max queue size', async () => {
        const res = await request(app).post('/api/services').send({
            name: "Test", description: "Desc", duration: 10, maxSize: 3.5,
            priority: "Low", date: "2026-11-01", time: "10:00"
        });
        expect(res.statusCode).toBe(400);
    });

    test('rejects an invalid priority level', async () => {
        const res = await request(app).post('/api/services').send({
            name: "Test", description: "Desc", duration: 10, maxSize: 15,
            priority: "Urgent", date: "2026-11-01", time: "10:00"
        });
        expect(res.statusCode).toBe(400);
    });

    test('updates an existing service', async () => {
        const list = await request(app).get('/api/services');
        const id = list.body.services[0].id;

        const res = await request(app).put('/api/services/' + id).send({
            name: "Academic Advising",
            description: "Updated description.",
            duration: 40,
            maxSize: 10,
            priority: "High",
            date: "2026-11-01",
            time: "09:00"
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.service.duration).toBe(40);
    });

    test('returns 404 when updating a missing service', async () => {
        const res = await request(app).put('/api/services/999').send({
            name: "X", description: "Y", duration: 10, maxSize: 10,
            priority: "Low", date: "2026-11-01", time: "10:00"
        });
        expect(res.statusCode).toBe(404);
    });

    test('deletes a service', async () => {
        const list = await request(app).get('/api/services');
        const id = list.body.services[0].id;

        const res = await request(app).delete('/api/services/' + id);
        expect(res.statusCode).toBe(200);

        const after = await request(app).get('/api/services');
        expect(after.body.services.length).toBe(2);
    });

    test('returns 404 when deleting a missing service', async () => {
        const res = await request(app).delete('/api/services/999');
        expect(res.statusCode).toBe(404);
    });

    test('gets a single service by id', async () => {
        const list = await request(app).get('/api/services');
        const id = list.body.services[0].id;

        const res = await request(app).get('/api/services/' + id);
        expect(res.statusCode).toBe(200);
        expect(res.body.service.name).toBe("Academic Advising");
    });

    test('returns 404 when getting a missing service', async () => {
        const res = await request(app).get('/api/services/999');
        expect(res.statusCode).toBe(404);
    });

    test('closes a service queue', async () => {
        const list = await request(app).get('/api/services');
        const id = list.body.services[0].id;

        const res = await request(app).post('/api/services/' + id + '/close');
        expect(res.statusCode).toBe(200);
        expect(res.body.service.open).toBe(false);
    });

    test('opens a service queue again', async () => {
        const list = await request(app).get('/api/services');
        const id = list.body.services[0].id;

        await request(app).post('/api/services/' + id + '/close');
        const res = await request(app).post('/api/services/' + id + '/open');
        expect(res.statusCode).toBe(200);
        expect(res.body.service.open).toBe(true);
    });

    // Creating a service also creates its Queue row
    test('creating a service creates its Queue', async () => {
        const res = await request(app).post('/api/services').send({
            name: "Queue Check", description: "Queue row check.", duration: 10, maxSize: 5,
            priority: "Low", date: "2026-11-01", time: "10:00"
        });
        expect(res.statusCode).toBe(201);
        const q = await Queue.findOne({ where: { serviceId: res.body.service.id } });
        expect(q).not.toBeNull();
        expect(q.status).toBe("open");
    });

    // Closing a service marks its Queue closed; opening marks it open again
    test('closing/opening a service updates its Queue status', async () => {
        const list = await request(app).get('/api/services');
        const id = list.body.services[0].id;

        await request(app).post('/api/services/' + id + '/close');
        let q = await Queue.findOne({ where: { serviceId: id } });
        expect(q.status).toBe("closed");

        await request(app).post('/api/services/' + id + '/open');
        q = await Queue.findOne({ where: { serviceId: id } });
        expect(q.status).toBe("open");
    });
});
