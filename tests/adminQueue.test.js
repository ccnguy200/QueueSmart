// Unit tests for the Queue Management module (Admin side)
const request = require('supertest');
const app = require('../server');
const { activeQueue } = require('../routes/userQueue');
const { resetServices } = require('../routes/services');
const { resetHistory } = require('../routes/history');
const { resetNotifications } = require('../routes/notifications');

// Join a queue through the API so the queue module creates the entry normally
function join(userName, service) {
    return request(app).post('/api/queue/join').send({
        userName: userName,
        service: service,
        queueDate: "2026-10-15",
        queueTime: "10:00",
        cardName: "Mary Jane",
        cardNumber: "1234567890123456",
        expDate: "12/28",
        cvv: "123"
    });
}

describe('Queue Management Module (Admin side)', function () {
    beforeEach(function () {
        activeQueue.length = 0;
        resetServices();
        resetHistory();
        resetNotifications();
    });

    test('serves the next user of a service', async function () {
        await join("Alice", "Academic Advising");
        await join("Bob", "Academic Advising");

        const res = await request(app).post('/api/admin/queue/serve').send({ service: "Academic Advising" });

        expect(res.statusCode).toBe(200);
        expect(res.body.user.userName).toBe("Alice");
        // Bob moves up to position 1
        expect(activeQueue.length).toBe(1);
        expect(activeQueue[0].position).toBe(1);
    });

    test('serves the highest-priority service first when no service is given', async function () {
        await join("Low Person", "Tutoring Services");   // Low priority
        await join("High Person", "Academic Advising");  // High priority

        const res = await request(app).post('/api/admin/queue/serve').send({});

        expect(res.body.user.userName).toBe("High Person");
    });

    test('returns 404 when there is no one to serve', async function () {
        const res = await request(app).post('/api/admin/queue/serve').send({});
        expect(res.statusCode).toBe(404);
    });

    test('reorders a user down within their service', async function () {
        await join("Alice", "Academic Advising");
        await join("Bob", "Academic Advising");
        await join("Carol", "Academic Advising");

        const res = await request(app)
            .post('/api/admin/queue/reorder')
            .send({ queueId: activeQueue[0].id, direction: "down" });

        expect(res.statusCode).toBe(200);
        expect(activeQueue[0].userName).toBe("Bob");
    });

    test('reorders a user up within their service', async function () {
        await join("Alice", "Academic Advising");
        await join("Bob", "Academic Advising");

        const res = await request(app)
            .post('/api/admin/queue/reorder')
            .send({ queueId: activeQueue[1].id, direction: "up" });

        expect(res.statusCode).toBe(200);
        expect(activeQueue[0].userName).toBe("Bob");
    });

    test('rejects a reorder with a bad direction', async function () {
        await join("Alice", "Academic Advising");

        const res = await request(app)
            .post('/api/admin/queue/reorder')
            .send({ queueId: activeQueue[0].id, direction: "sideways" });

        expect(res.statusCode).toBe(400);
    });

    test('records a served user in history', async function () {
        await join("Alice", "Academic Advising");
        await request(app).post('/api/admin/queue/serve').send({ service: "Academic Advising" });

        const res = await request(app).get('/api/history');
        const served = res.body.history.find(function (record) {
            return record.userName === "Alice" && record.outcome === "Served";
        });
        expect(served).toBeTruthy();
    });

    test('marks a no-show and records it as Missed', async function () {
        await join("Alice", "Academic Advising");
        await request(app).post('/api/admin/queue/no-show').send({ service: "Academic Advising" });

        expect(activeQueue.length).toBe(0);

        const res = await request(app).get('/api/history');
        const missed = res.body.history.find(function (record) {
            return record.userName === "Alice" && record.outcome === "Missed";
        });
        expect(missed).toBeTruthy();
    });

    test('rejects a join when the service queue is closed', async function () {
        await request(app).post('/api/services/1/close');
        const res = await join("Alice", "Academic Advising");
        expect(res.statusCode).toBe(400);
    });

    test('removes a user from the queue by id', async function () {
        await join("Alice", "Academic Advising");
        await join("Bob", "Academic Advising");

        const res = await request(app).delete('/api/admin/queue/' + activeQueue[1].id);
        expect(res.statusCode).toBe(200);
        expect(activeQueue.length).toBe(1);
        expect(activeQueue[0].userName).toBe("Alice");
    });

    test('returns 404 when removing a missing queue entry', async function () {
        const res = await request(app).delete('/api/admin/queue/does-not-exist');
        expect(res.statusCode).toBe(404);
    });
});
