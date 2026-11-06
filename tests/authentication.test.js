// Setup + in terminal (CTRL + shift + Y) use command 'npm test' to run unit testing 
// (to install use 'npm install' in the console)
const request = require('supertest');
const app = require('../server');
const { sequelize, UserProfile } = require('../tables');
const { resetUsers } = require('../server');

describe('Unit Tests for Authentication', () => {
    beforeAll(async () => {
        await sequelize.sync({force: true});
    });

    beforeEach(async () => {
        await resetUsers();
    });

    afterAll(async () => {
        await sequelize.close();
    });

    // Test 1: Incorrect Username (Login)
    // Expected Output: should return 401 error message
    test('Return 401 error message if username is incorrect', async () => {
        const incorrectLogin = {
            email: "incorrect@email.com",
            password: "incorrect"
        };
        
        const response = await request(app).post('/api/auth/login').send(incorrectLogin);

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
        
        const response = await request(app).post('/api/auth/register').send(incorrectInfo);

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
        
        const response = await request(app).post('/api/auth/register').send(correctInfo);

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
        
        const response = await request(app).post('/api/auth/register').send(correctInfo);

        // Expected Message: 200 (success)
        expect(response.statusCode).toBe(200);
        expect(response.body.role).toBe("admin");
    });

    // Test 5: Login correctly (Login)
    // Expected Output: should return 200
    test('Return 200 message if the fields are correct for login', async () => {
        // Correct fields
        await request(app).post('/api/auth/register').send({
            first: "AdminUsername@email.com",
            second: "Password12345",
            role: "admin",
            cardNumber: "1234567898765432",
            cardExpiry: "12/30",
            cardCVV: "123"
        });
        
        const response = await request(app).post('/api/auth/login').send({ email: "AdminUsername@email.com", password: "Password12345" });

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
        await request(app).post('/api/auth/register').send(info);

        const response = await request(app)
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

        const response = await request(app).post('/api/auth/register').send(info);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBeDefined();
    });

    // Test 8: Register with a password that is too short
    // Expected Output: should return 400
    test('Return 400 if the password is shorter than 8 characters', async () => {
        const info = {
            first: "shortpw@email.com",
            second: "short",
            role: "user"
        };

        const response = await request(app).post('/api/auth/register').send(info);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBeDefined();
    });

    // Registration must create a matching UserProfile row
    test('Registration creates a UserProfile', async () => {
        await request(app).post('/api/auth/register').send({
            first: "profile@email.com", second: "password12", role: "user", fullName: "Profile Person"
        });
        const profile = await UserProfile.findOne({ where: { email: "profile@email.com" } });
        expect(profile).not.toBeNull();
        expect(profile.fullName).toBe("Profile Person");
        expect(profile.userId).toBeDefined();
    });

    // GET /api/auth/profile returns the stored profile
    test('GET /api/auth/profile returns the stored profile', async () => {
        await request(app).post('/api/auth/register').send({
            first: "profile2@email.com", second: "password12", role: "user",
            fullName: "Second Person", contactInfo: "555-1234", preferences: "email"
        });
        const res = await request(app).get('/api/auth/profile?email=profile2@email.com');
        expect(res.statusCode).toBe(200);
        expect(res.body.profile.fullName).toBe("Second Person");
        expect(res.body.profile.contactInfo).toBe("555-1234");
    });

    // GET profile for an unknown email returns 404
    test('GET /api/auth/profile returns 404 for an unknown email', async () => {
        const res = await request(app).get('/api/auth/profile?email=nobody@email.com');
        expect(res.statusCode).toBe(404);
    });
});