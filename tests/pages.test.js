// Unit tests for the front-end page routes in server.js
const request = require('supertest');
const app = require('../server');

describe('front-end pages', function () {
    test('the home page opens', async function () {
        const response = await request(app).get('/');

        expect(response.status).toBe(200);
        expect(response.text).toContain("<title>QueueSmart</title>");
    });

    test('pages in second/ open', async function () {
        const response = await request(app).get('/second/login.html');

        expect(response.status).toBe(200);
        expect(response.text).toContain("<title>Login</title>");
    });

    test('images open', async function () {
        const response = await request(app).get('/images/logo.jpg');

        expect(response.status).toBe(200);
    });

    test('front-end files in the main folder open', async function () {
        const files = ['/index.html', '/styles.css', '/script.js', '/popup.js', '/location.js'];

        for (let i = 0; i < files.length; i++) {
            const response = await request(app).get(files[i]);
            expect(response.status).toBe(200);
        }
    });

    test('back-end files are not shared', async function () {
        const files = ['/server.js', '/package.json', '/routes/notifications.js', '/tests/pages.test.js'];

        for (let i = 0; i < files.length; i++) {
            const response = await request(app).get(files[i]);
            expect(response.status).toBe(404);
        }
    });
});

describe('GET /api/health', function () {
    test('says the server is running', async function () {
        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.text).toBe("QueueSmart API Server is running...");
    });
});
