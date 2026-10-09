// unit testing will test API routes (join and leave), inputs validations, and wait-time estimation logic outputs correct calculation
// in terminal, use command 'npm test' to run unit testing

// intial setup: setup configurations for express and sending reqs and importing queue arr for testing
const sendRequest = require('supertest');
const importApp = require('../server');
const { activeQueue } = require('../routes/userQueue');

// test suite: 'Unit Tests for User Queue Module'
describe('Unit Tests for User Module', () => {
    // clear arr before each test
    beforeEach(() => {
        activeQueue.length = 0;
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

});

// test 2: will test join route and wait-time logic for first person joining an empty queue
// expected output: person should get position 1 and wait time = 0

// test 3: will test join route and wait-time logic for second person joining behind the first person
// expectec output: person should get position 2 and wait time = 30 (for academic advising in this case)

// test 4: will test leave route where user leaves or cancels a queue
// expected output: user should be able to leave successfully and their entry should be removed from activeQueue
