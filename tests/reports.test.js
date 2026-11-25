// Unit tests for the Reporting Module (Admin side)
const request = require('supertest');
const app = require('../server');
const { sequelize, NotificationHistory } = require('../tables');
const { seedServices } = require('../routes/services');

// Join a queue through the API so history gets written when served
function join(userName, service) {
    return request(app).post('/api/queue/join').send(
    {
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

describe('Reporting Module (Admin side)', function () {
    beforeEach(async () => {
        await sequelize.sync({ force: true });
        await seedServices();
    });

    afterAll(async () => {
        await sequelize.close();
    });

    // Test 1: Make sure served users show up in the totals
    test('returns served/missed totals from history records', async () => {
        await join("Alice", "Academic Advising");
        await join("Bob", "Academic Advising");
        await join("Carol", "Financial Aid Office");

        await request(app).post('/api/admin/queue/serve').send({ service: "Academic Advising" });
        await request(app).post('/api/admin/queue/serve').send({ service: "Academic Advising" });
        await request(app).post('/api/admin/queue/no-show').send({ service: "Financial Aid Office" });

        const res = await request(app).get('/api/admin/reports').set('x-admin-role', 'admin');

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.totals.served).toBe(2);
        expect(res.body.totals.missed).toBe(1);
        expect(res.body.totals.avgWait).toBeGreaterThanOrEqual(0);
        expect(res.body.totals.noShowRate).toBe(33);
    });

    // Test 2: Waiting entries must not count as served
    test('waiting entries are not counted as served', async () => {
        await join("Alice", "Academic Advising");  // still waiting
        await join("Bob", "Academic Advising");
        await request(app).post('/api/admin/queue/serve').send({ service: "Academic Advising" });

        const res = await request(app).get('/api/admin/reports').set('x-admin-role', 'admin');
        expect(res.body.totals.served).toBe(1);   // only Bob, not Alice
        expect(res.body.totals.missed).toBe(0);
    });

    // Test 3: Service filter narrows the report
    test('filters by service', async () => {
        await join("Alice", "Academic Advising");
        await join("Bob", "Financial Aid Office");
        await request(app).post('/api/admin/queue/serve').send({ service: "Academic Advising" });
        await request(app).post('/api/admin/queue/serve').send({ service: "Financial Aid Office" });

        const res = await request(app).get('/api/admin/reports?service=Academic Advising').set('x-admin-role', 'admin');
        expect(res.statusCode).toBe(200);
        expect(res.body.totals.served).toBe(1);
        expect(res.body.byService.length).toBe(1);
        expect(res.body.byService[0].service).toBe("Academic Advising");
    });

    // Test 4: Date-range filter excludes out-of-range records
    test('filters by date range', async () => {
        await NotificationHistory.destroy({ where: {} });

        await NotificationHistory.create({
            userName: "Old User", type: "history", message: "x",
            service: "Academic Advising", outcome: "Served", wait: 5, date: "2020-01-01"
        });
        await NotificationHistory.create({
            userName: "New User", type: "history", message: "x",
            service: "Academic Advising", outcome: "Served", wait: 10, date: "2026-06-15"
        });

        // Force pending writes to commit before the HTTP request reads them
        await NotificationHistory.count();

        const res = await request(app).get('/api/admin/reports?from=2026-01-01&to=2026-12-31').set('x-admin-role', 'admin');
        expect(res.statusCode).toBe(200);
        expect(res.body.totals.served).toBe(1);
        expect(res.body.users.length).toBe(1);
        expect(res.body.users[0].userName).toBe("New User");
    });

    // Test 5: Empty result returns zeroed totals, not an error
    test('returns zeroed totals when no records match', async () => {
        const res = await request(app).get('/api/admin/reports?from=1900-01-01&to=1900-12-31').set('x-admin-role', 'admin');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.totals.served).toBe(0);
        expect(res.body.totals.missed).toBe(0);
        expect(res.body.totals.avgWait).toBe(0);
        expect(res.body.totals.noShowRate).toBe(0);
    });

    // Test 6: CSV export returns text/csv with a header row
    test('exports CSV with the expected headers', async () => {
        await join("Alice", "Academic Advising");
        await request(app).post('/api/admin/queue/serve').send({ service: "Academic Advising" });

        const res = await request(app).get('/api/admin/reports/export.csv').set('x-admin-role', 'admin');
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.headers['content-disposition']).toContain('queuesmart-report.csv');
        expect(res.text).toContain('Totals');
        expect(res.text).toContain('Served,Missed,Left');
        expect(res.text).toContain('By Service');
        expect(res.text).toContain('By User');
    });

    // Test 7: CSV quotes values containing commas (no broken rows)
    test('CSV escapes values with commas', async () => {
        await NotificationHistory.create({
            userName: "Doe, Jane", type: "history", message: "x",
            service: "Academic Advising", outcome: "Served", wait: 5, date: "2026-06-15"
        });

        const res = await request(app).get('/api/admin/reports/export.csv').set('x-admin-role', 'admin');
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain('"Doe, Jane"');
    });

    // Test 8: Rejects requests without the admin role header
    test('rejects requests without admin role header', async () => {
        const res = await request(app).get('/api/admin/reports');
        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Admin access required.");
    });
});