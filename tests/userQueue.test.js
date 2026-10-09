// unit testing will test API routes (join and leave), inputs validations, and wait-time estimation logic outputs correct calculation

// intial setup: setup configurations for express and sending reqs and importing queue arr for testing

// test suite: 'Unit Tests for User Queue Module'

// test 1: will test input validation for payment details and other required fields
// expected output: should return 400 error if required fields are missing

// test 2: will test join route and wait-time logic for first person joining an empty queue
// expected output: person should get position 1 and wait time = 0

// test 3: will test join route and wait-time logic for second person joining behind the first person
// expectec output: person should get position 2 and wait time = 30 (for academic advising in this case)

// test 4: will test leave route where user leaves or cancels a queue
// expected output: user should be able to leave successfully and their entry should be removed from activeQueue
