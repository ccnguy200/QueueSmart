// unit testing will test API routes (join and leave), inputs validations, and wait-time estimation logic outputs correct calculation
// total unit testing: run 'npm test' (will run for all test files)
// isolated unit testing: run 'npx jest tests/userQueue.test.js'

// intial setup: setup configurations for express and sending reqs and importing queue arr for testing
const sendRequest = require('supertest');
const importApp = require('../server');
const { sequelize, QueueEntry } = require('../tables');

// test suite: 'Unit Tests for User Queue Module'
describe('Unit Tests for User Module', () => {
    // clear in-memory database before each test
    beforeEach(async () => {
        await sequelize.sync({ force: true });
    });

    // test 1: will test input validation for payment details and other required fields
    // expected output: should return 400 error if required fields are missing
    test('Return 400 error message if missing required fields', async () => {
        // incomplete payment details
        const incompleteDetails = {
            service: "Academic Advising"
        };
        
        const response = await sendRequest(importApp).post('/api/queue/join').send(incompleteDetails);

        // expected message: 400 error message w/ rejection
        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
    });

    // test 2: will test join route and wait-time logic for first person joining an empty queue
    // expected output: person should get position 1 and wait time = 0
    test('First person to join queue will be at position 1 and have wait time = 0', async () => {
        // valid test example
        const validExample = {
            userName: "Mary Jane",
            service: "Academic Advising",
            queueDate: "2026-10-12",
            queueTime: "07:00",
            cardName: "Mary Jane",
            cardNumber: "1234567898765432",
            expDate: "07/29",
            cvv: "123"
        };

        // send request to api join route
        const response = await sendRequest(importApp).post('/api/queue/join').send(validExample);

        // expected output: status code 201 / position = 1 / wait time = 0
        expect(response.statusCode).toBe(201);
        expect(response.body.data.position).toBe(1);
        expect(response.body.data.estimatedWaitTime).toBe(0);
    });

    // test 3: will test join route and wait-time logic for second person joining behind the first person
    // expectec output: person should get position 2 and wait time = 30 (for academic advising in this case)
    test('Second person to join queue will be at position 2 and have wait time = 30', async () => {
        // add hypothetical first person to database
        await QueueEntry.create({
            userName: "First person",
            service: "Academic Advising",
            position: 1,
            queueDate: "2026-10-12",
            queueTime: "07:00",
            status: "waiting"
        });

        // valid test example
        const validExample = {
            userName: "Bob Jones",
            service: "Academic Advising",
            queueDate: "2026-10-12",
            queueTime: "07:10",
            cardName: "Bob Jones",
            cardNumber: "9876543212345678",
            expDate: "06/28",
            cvv: "321"
        };

        // send request to api join route
        const response = await sendRequest(importApp).post('/api/queue/join').send(validExample);

        // expected output: status code 201 / position = 2 / wait time = 30
        expect(response.statusCode).toBe(201);
        expect(response.body.data.position).toBe(2);
        expect(response.body.data.estimatedWaitTime).toBe(30); // rule based logic: (2-1)*30 = 30
    });

    // test 4: will test leave route where user leaves or cancels a queue
    // expected output: user should be able to leave successfully and their entry should be removed from database
    test('User leaves queue successfully', async () => {
        // add hypothetical entry into database
        const entry = await QueueEntry.create({
            userName: "Person in queue",
            service: "Academic Advising",
            position: 1,
            queueDate: "2026-10-12",
            queueTime: "07:00",
            status: "waiting"
        });

        // send request to api leave route
        const response = await sendRequest(importApp).post('/api/queue/leave').send({ queueId: entry.id });

        // expected output: status code 200 / entry should be removed from database
        expect(response.statusCode).toBe(200);
        const count = await QueueEntry.count();
        expect(count).toBe(0);
    });

    // test 5: will test reschedule route for calendar feature
    // expected output: appt date and time should be updated successfully
    test('User reschedules appointment successfully', async () => {
        // add hypothetical entry into database
        const entry = await QueueEntry.create({
            userName: "Reschedule User",
            service: "Academic Advising",
            position: 1,
            queueDate: "2026-10-16",
            queueTime: "09:00",
            status: "waiting"
        });

        // valid rescheduling details to send
        const reschedulePayload = {
            queueId: entry.id,
            newDate: "2026-10-17",
            newTime: "10:00"
        };

        // send request to api reschedule route
        const response = await sendRequest(importApp).put('/api/queue/reschedule').send(reschedulePayload);

        // expected output: status code 200 / date and time to update successfully
        expect(response.statusCode).toBe(200);
        const updated = await QueueEntry.findByPk(entry.id);
        expect(updated.queueDate).toBe("2026-10-17");
        expect(updated.queueTime).toBe("10:00");
    });

    // test 6: will test cancel route for calendar fearure
    // expetec output: appt status should be set to 'canceled'
    test('User cancels appointment successfully', async () => {
        // add hypothetical entry into database
        const entry = await QueueEntry.create({
            userName: "Cancel User",
            service: "Financial Aid Office",
            position: 1,
            queueDate: "2026-10-16",
            queueTime: "05:00",
            status: "waiting"
        });

        // send request to api cancel route
        const response = await sendRequest(importApp).put('/api/queue/cancel').send({ queueId: entry.id });

        // expected output: status code 200 / target appt status = "Canceled"
        expect(response.statusCode).toBe(200);
        const updated = await QueueEntry.findByPk(entry.id);
        expect(updated.status).toBe("Canceled");
    });
});
