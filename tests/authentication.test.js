// Setup + in terminal (CTRL + shift + Y) use command 'npm test' to run unit testing 
// (to install use 'npm install' in the console)
const sendRequest = require('supertest');
const importApp = require('../server');
const { resetUsers } = require('../server');

describe('Unit Tests for Authentication', () => {
    beforeEach(() => {
        resetUsers();
    });

    // Test 1: Incorrect Username (Login)
    // Expected Output: should return 401 error message
    test('Return 401 error message if username is incorrect', async () => {
        const incorrectLogin = {
            email: "incorrect@email.com",
            password: "incorrect"
        };
        
        const response = await sendRequest(importApp).post('/api/auth/login').send(incorrectLogin);

        // Expected Message: 401 error message w/ rejection
        expect(response.statusCode).toBe(401);
        expect(response.body.error).toBeDefined();
    });

    // Test 2: Missing or incorrect fields (Register)
    // Expected Output: should return 400 error message
    test('Return 400 error message if the fields are missing or incorrect for register', async () => {
        const incorrectInfo = {
            first: "",
            second: "",
            role: "user"
        };
        
        const response = await sendRequest(importApp).post('/api/auth/register').send(incorrectInfo);

        // Expected Message: 400 error message w/ rejection
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBeDefined();
    });

    // Test 3: Register correctly for user (Register)
    // Expected Output: should return 200
    test('Return 200 when registering a user', async () => {
        // Correct fields
        const correctInfo = {
            first: "UserUsername@email.com",
            second: "Password12345",
            role: "user"
        };
        
        const response = await sendRequest(importApp).post('/api/auth/register').send(correctInfo);

        // Expected Message: 200 (success)
        expect(response.statusCode).toBe(200);
        expect(response.body.role).toBe("user");
    });

    // Test 4: Register correctly for admin (Register)
    // Expected Output: should return 200
    test('Return 200 message if the fields are correct for registering an admin', async () => {
        // Correct fields
        const correctInfo = {
            first: "AdminUsername@email.com",
            second: "Password12345",
            role: "admin",
            cardNumber: "1234567898765432",
            cardExpiry: "12/30",
            cardCVV: "123"
        };
        
        const response = await sendRequest(importApp).post('/api/auth/register').send(correctInfo);

        // Expected Message: 200 (success)
        expect(response.statusCode).toBe(200);
        expect(response.body.role).toBe("admin");
    });

    // Test 5: Login correctly (Login)
    // Expected Output: should return 200
    test('Return 200 message if the fields are correct for login', async () => {
        // Correct fields
        await sendRequest(importApp).post('/api/auth/register').send({
            first: "AdminUsername@email.com",
            second: "Password12345",
            role: "admin",
            cardNumber: "1234567898765432",
            cardExpiry: "12/30",
            cardCVV: "123"
        });
        
        const response = await sendRequest(importApp).post('/api/auth/login').send({ email: "AdminUsername@email.com", password: "Password12345" });

        // Expected Message: 200 (success)
        expect(response.statusCode).toBe(200);
        expect(response.body.role).toBe("admin");
    });

    // Test 6: Register with an existing account (Register)
    // Expected Output: should return 409
    test('Return 409 if account already exists', async () => {
        const info = {
            first: "AdminUsername@email.com",
            second: "Password12345",
            role: "admin",
            cardNumber: "1234567898765432",
            cardExpiry: "12/30",
            cardCVV: "123"
        };
        await sendRequest(importApp).post('/api/auth/register').send(info);

        const response = await sendRequest(importApp)
            .post('/api/auth/register')
            .send(info);

        expect(response.statusCode).toBe(409);
        expect(response.body.error).toBeDefined();
    });

    // Test 7: Register with an invalid role
    // Expected Output: should return 400
    test('Return 400 if the role is not user or admin', async () => {
        const info = {
            first: "role@email.com",
            second: "Password12345",
            role: "superadmin"
        };

        const response = await sendRequest(importApp).post('/api/auth/register').send(info);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBeDefined();
    });
});