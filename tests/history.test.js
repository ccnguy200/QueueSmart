// Unit tests for the History module (database-backed)
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../tables');
const { recordEntry } = require('../routes/history');

describe('History Module', function () {
    beforeEach(async () => {
        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('starts empty', async () => {
        const res = await request(app).get('/api/history');
        expect(res.statusCode).toBe(200);
        expect(res.body.history.length).toBe(0);
    });

    test('recordEntry adds a record that is then listed', async () => {
        await recordEntry("bob@email.com", "Academic Advising", "Served", 30);

        const res = await request(app).get('/api/history');
        expect(res.body.history.length).toBe(1);
        expect(res.body.history[0].userName).toBe("bob@email.com");
        expect(res.body.history[0].outcome).toBe("Served");
    });

    test('filters by outcome', async () => {
        await recordEntry("bob@email.com", "Academic Advising", "Served", 30);
        await recordEntry("carol@email.com", "Tutoring Services", "Left Queue", 5);

        const res = await request(app).get('/api/history').query({ outcome: "Served" });
        expect(res.body.history.length).toBe(1);
        expect(res.body.history[0].outcome).toBe("Served");
    });

    test('filters by userName', async () => {
        await recordEntry("bob@email.com", "Academic Advising", "Served", 30);
        await recordEntry("carol@email.com", "Tutoring Services", "Served", 5);

        const res = await request(app).get('/api/history').query({ userName: "carol@email.com" });
        expect(res.body.history.length).toBe(1);
        expect(res.body.history[0].userName).toBe("carol@email.com");
    });

    test('recordEntry rejects a bad outcome', async () => {
        const rec = await recordEntry("bob@email.com", "Academic Advising", "Weird", 30);
        expect(rec).toBeNull();

        const res = await request(app).get('/api/history');
        expect(res.body.history.length).toBe(0);
    });

    test('recordEntry rejects a missing user name', async () => {
        const rec = await recordEntry("", "Academic Advising", "Served", 30);
        expect(rec).toBeNull();
    });

    test('recordEntry rejects a missing service', async () => {
        const rec = await recordEntry("bob@email.com", "", "Served", 30);
        expect(rec).toBeNull();
    });
});
