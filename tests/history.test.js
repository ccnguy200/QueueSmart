// Unit tests for the History module
const request = require('supertest');
const app = require('../server');
const { history, recordEntry, resetHistory } = require('../routes/history');

describe('History Module', function () {
    beforeEach(function () {
        resetHistory();
    });

    test('starts with the mock history', async function () {
        const res = await request(app).get('/api/history');
        expect(res.statusCode).toBe(200);
        expect(res.body.history.length).toBe(6);
    });

    test('filters by outcome', async function () {
        const res = await request(app).get('/api/history').query({ outcome: "Served" });
        expect(res.body.history.length).toBeGreaterThan(0);
        for (let i = 0; i < res.body.history.length; i++) {
            expect(res.body.history[i].outcome).toBe("Served");
        }
    });

    test('filters by userName', async function () {
        const res = await request(app).get('/api/history').query({ userName: "user@email.com" });
        expect(res.body.history.length).toBe(6);
    });

    test('recordEntry adds a new record at the top', function () {
        const before = history.length;
        recordEntry("bob@email.com", "Academic Advising", "Served", 30);
        expect(history.length).toBe(before + 1);
        expect(history[0].userName).toBe("bob@email.com");
        expect(history[0].outcome).toBe("Served");
    });

    test('recordEntry rejects a bad outcome', function () {
        const before = history.length;
        const rec = recordEntry("bob@email.com", "Academic Advising", "Weird", 30);
        expect(rec).toBeNull();
        expect(history.length).toBe(before);
    });

    test('recordEntry rejects a missing user name', function () {
        const rec = recordEntry("", "Academic Advising", "Served", 30);
        expect(rec).toBeNull();
    });

    test('recordEntry rejects a missing service', function () {
        const rec = recordEntry("bob@email.com", "", "Served", 30);
        expect(rec).toBeNull();
    });
});
