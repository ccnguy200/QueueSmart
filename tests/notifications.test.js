// Unit tests for the Notification Module (routes/notifications.js)
const request = require('supertest');

let app;
let notifications;

// A valid join request for the Queue Management module
function joinRequest(userName, service) {
    return {
        userName: userName,
        service: service,
        queueDate: "2026-12-01",
        queueTime: "10:30",
        cardName: "Test User",
        cardNumber: "1234123412341234",
        expDate: "12/28",
        cvv: "123"
    };
}

// A queue entry like the ones the Queue Management module makes
function makeEntry(userName, service, status) {
    return {
        id: "Q-" + userName,
        userName: userName,
        service: service,
        position: 1,
        estimatedWaitTime: 0,
        status: status
    };
}

// Get the notifications made for a user from the API
// (the mock notifications every user starts with are left out)
async function getMessages(userName) {
    const response = await request(app).get('/api/notifications').query({ userName: userName });
    const messages = [];
    for (let i = 0; i < response.body.notifications.length; i++) {
        if (response.body.notifications[i].userName === userName) {
            messages.push(response.body.notifications[i].message);
        }
    }
    return messages;
}

// Every test starts with a fresh server: empty queue and only the mock notifications
beforeEach(function () {
    jest.resetModules();
    app = require('../server');
    notifications = require('../routes/notifications');
    jest.spyOn(console, 'log').mockImplementation(function () {});
});

afterEach(function () {
    jest.restoreAllMocks();
});

describe('formatTime', function () {
    test('morning time', function () {
        expect(notifications.formatTime(new Date(2026, 9, 9, 9, 5))).toBe("9:05 AM");
    });

    test('afternoon time', function () {
        expect(notifications.formatTime(new Date(2026, 9, 9, 13, 30))).toBe("1:30 PM");
    });

    test('midnight and noon show 12', function () {
        expect(notifications.formatTime(new Date(2026, 9, 9, 0, 0))).toBe("12:00 AM");
        expect(notifications.formatTime(new Date(2026, 9, 9, 12, 0))).toBe("12:00 PM");
    });
});

describe('checkUserName (validation)', function () {
    test('userName is required', function () {
        expect(notifications.checkUserName(undefined)).toBe("userName is required.");
        expect(notifications.checkUserName(null)).toBe("userName is required.");
        expect(notifications.checkUserName("")).toBe("userName is required.");
        expect(notifications.checkUserName("   ")).toBe("userName is required.");
    });

    test('userName must be text', function () {
        expect(notifications.checkUserName(123)).toBe("userName must be text.");
        expect(notifications.checkUserName(["a", "b"])).toBe("userName must be text.");
    });

    test('userName can be at most 100 characters', function () {
        expect(notifications.checkUserName("a".repeat(100))).toBe("");
        expect(notifications.checkUserName("a".repeat(101))).toBe("userName must be 100 characters or less.");
    });

    test('a normal userName is fine', function () {
        expect(notifications.checkUserName("user@email.com")).toBe("");
    });
});

describe('addNotification', function () {
    test('saves and logs a notification', function () {
        const notification = notifications.addNotification("a@email.com", "joined", "Hello");

        expect(notification.userName).toBe("a@email.com");
        expect(notification.type).toBe("joined");
        expect(notification.message).toBe("Hello");
        expect(notification.time).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
        expect(console.log).toHaveBeenCalledWith("Notification for a@email.com: Hello");
    });

    test('every notification gets a different id', function () {
        const first = notifications.addNotification("a@email.com", "joined", "One");
        const second = notifications.addNotification("a@email.com", "joined", "Two");

        expect(second.id).not.toBe(first.id);
    });

    test('rejects a bad userName or an empty message', function () {
        expect(notifications.addNotification("", "joined", "Hello")).toBe(null);
        expect(notifications.addNotification("a@email.com", "joined", "")).toBe(null);
        expect(notifications.addNotification("a@email.com", "joined", 5)).toBe(null);
        expect(console.log).not.toHaveBeenCalled();
    });
});

describe('notifyJoined (trigger 1: user joins a queue)', function () {
    test('makes a "joined" notification with the position and wait', function () {
        const entry = makeEntry("a@email.com", "Financial Aid Office", "waiting");
        entry.position = 2;
        entry.estimatedWaitTime = 24;

        const notification = notifications.notifyJoined(entry);

        expect(notification.type).toBe("joined");
        expect(notification.message).toBe("You joined the Financial Aid Office queue. You are #2. Estimated wait: 24 minutes.");
    });

    test('leaves out the position and wait if they are missing', function () {
        const entry = { userName: "a@email.com", service: "Tutoring Services" };

        expect(notifications.notifyJoined(entry).message).toBe("You joined the Tutoring Services queue.");
    });

    test('does nothing for a missing entry or service', function () {
        expect(notifications.notifyJoined(undefined)).toBe(null);
        expect(notifications.notifyJoined({ userName: "a@email.com" })).toBe(null);
        expect(notifications.notifyJoined({ userName: "a@email.com", service: "" })).toBe(null);
    });

    test('does nothing when the userName is not valid', function () {
        expect(notifications.notifyJoined({ userName: "", service: "Tutoring Services" })).toBe(null);
    });
});

describe('checkQueue (trigger 2: user is close to being served)', function () {
    test('notifies positions 1 and 2, but not 3', async function () {
        const queue = [
            makeEntry("a@email.com", "Academic Advising", "waiting"),
            makeEntry("b@email.com", "Academic Advising", "waiting"),
            makeEntry("c@email.com", "Academic Advising", "waiting")
        ];

        expect(notifications.checkQueue(queue)).toBe(2);
        expect(await getMessages("a@email.com")).toEqual(["It's almost your turn! You are next in the Academic Advising queue."]);
        expect(await getMessages("b@email.com")).toEqual(["It's almost your turn! You are #2 in the Academic Advising queue."]);
        expect(await getMessages("c@email.com")).toEqual([]);
    });

    test('each service has its own line', function () {
        const queue = [
            makeEntry("a@email.com", "Academic Advising", "waiting"),
            makeEntry("b@email.com", "Academic Advising", "waiting"),
            makeEntry("c@email.com", "Tutoring Services", "waiting")
        ];

        expect(notifications.checkQueue(queue)).toBe(3);
    });

    test('notifies each entry only once', function () {
        const queue = [makeEntry("a@email.com", "Academic Advising", "waiting")];

        expect(notifications.checkQueue(queue)).toBe(1);
        expect(notifications.checkQueue(queue)).toBe(0);
    });

    test('people who are not waiting do not count', async function () {
        const queue = [
            makeEntry("a@email.com", "Academic Advising", "waiting"),
            makeEntry("b@email.com", "Academic Advising", "waiting"),
            makeEntry("c@email.com", "Academic Advising", "waiting")
        ];
        notifications.checkQueue(queue);

        // a is served, so c moves up to #2
        queue[0].status = "served";

        expect(notifications.checkQueue(queue)).toBe(1);
        expect(await getMessages("c@email.com")).toEqual(["It's almost your turn! You are #2 in the Academic Advising queue."]);
    });

    test('an entry with a bad userName is skipped', function () {
        const queue = [makeEntry("", "Academic Advising", "waiting")];

        expect(notifications.checkQueue(queue)).toBe(0);
    });

    test('returns 0 if the queue is not a list', function () {
        expect(notifications.checkQueue(undefined)).toBe(0);
        expect(notifications.checkQueue("queue")).toBe(0);
    });
});

describe('GET /api/notifications', function () {
    test('400 when userName is missing', async function () {
        const response = await request(app).get('/api/notifications');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ success: false, message: "userName is required." });
    });

    test('400 when userName is given twice', async function () {
        const response = await request(app).get('/api/notifications?userName=a&userName=b');

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("userName must be text.");
    });

    test('400 when userName is too long', async function () {
        const response = await request(app).get('/api/notifications').query({ userName: "a".repeat(101) });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("userName must be 100 characters or less.");
    });

    test('every user starts with the mock notifications, newest first', async function () {
        const response = await request(app).get('/api/notifications').query({ userName: "new@email.com" });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.notifications.length).toBe(4);
        expect(response.body.notifications[0].message).toBe("Your position in the Academic Advising queue is now #3.");
        expect(response.body.notifications[3].time).toBe("9:00 AM");
    });

    test('notifications made for the user come before the mock ones', async function () {
        notifications.addNotification("a@email.com", "joined", "Hello");
        notifications.addNotification("b@email.com", "joined", "Not for a");
        notifications.addNotification("a@email.com", "almost", "Hello again");

        const response = await request(app).get('/api/notifications').query({ userName: "a@email.com" });

        expect(response.body.notifications.length).toBe(6);
        expect(response.body.notifications[0].message).toBe("Hello again");
        expect(response.body.notifications[1].message).toBe("Hello");
        expect(response.body.notifications[2].message).toBe("Your position in the Academic Advising queue is now #3.");
    });

    test('resetNotifications keeps only the mock notifications', async function () {
        notifications.addNotification("a@email.com", "joined", "Hello");
        notifications.resetNotifications();

        const response = await request(app).get('/api/notifications').query({ userName: "a@email.com" });

        expect(await getMessages("a@email.com")).toEqual([]);
        expect(response.body.notifications.length).toBe(4);
    });
});

describe('joining a queue sends notifications', function () {
    test('the first person gets "joined" and "almost your turn"', async function () {
        const join = await request(app).post('/api/queue/join').send(joinRequest("a@email.com", "Financial Aid Office"));

        expect(join.status).toBe(201);
        expect(await getMessages("a@email.com")).toEqual([
            "It's almost your turn! You are next in the Financial Aid Office queue.",
            "You joined the Financial Aid Office queue. You are #1. Estimated wait: 0 minutes."
        ]);
    });

    test('the third person in line only gets "joined"', async function () {
        await request(app).post('/api/queue/join').send(joinRequest("a@email.com", "Academic Advising"));
        await request(app).post('/api/queue/join').send(joinRequest("b@email.com", "Academic Advising"));
        await request(app).post('/api/queue/join').send(joinRequest("c@email.com", "Academic Advising"));

        expect(await getMessages("b@email.com")).toEqual([
            "It's almost your turn! You are #2 in the Academic Advising queue.",
            "You joined the Academic Advising queue. You are #2. Estimated wait: 30 minutes."
        ]);
        expect(await getMessages("c@email.com")).toEqual([
            "You joined the Academic Advising queue. You are #3. Estimated wait: 60 minutes."
        ]);
    });

    test('a join with missing fields sends no notification', async function () {
        const join = await request(app).post('/api/queue/join').send({ userName: "a@email.com" });

        expect(join.status).toBe(400);
        expect(await getMessages("a@email.com")).toEqual([]);
    });
});

describe('leaving a queue', function () {
    test('the people behind move up, other services stay the same', async function () {
        const first = await request(app).post('/api/queue/join').send(joinRequest("a@email.com", "Academic Advising"));
        await request(app).post('/api/queue/join').send(joinRequest("b@email.com", "Academic Advising"));
        await request(app).post('/api/queue/join').send(joinRequest("d@email.com", "Tutoring Services"));
        await request(app).post('/api/queue/join').send(joinRequest("c@email.com", "Academic Advising"));

        const leave = await request(app).post('/api/queue/leave').send({ queueId: first.body.data.id });
        const status = await request(app).get('/api/queue/status');

        expect(leave.status).toBe(200);
        expect(status.body.queue.length).toBe(3);

        // b is now #1 and c is now #2 in Academic Advising
        expect(status.body.queue[0].userName).toBe("b@email.com");
        expect(status.body.queue[0].position).toBe(1);
        expect(status.body.queue[0].estimatedWaitTime).toBe(0);
        expect(status.body.queue[2].userName).toBe("c@email.com");
        expect(status.body.queue[2].position).toBe(2);
        expect(status.body.queue[2].estimatedWaitTime).toBe(30);

        // d is still #1 in Tutoring Services
        expect(status.body.queue[1].userName).toBe("d@email.com");
        expect(status.body.queue[1].position).toBe(1);
    });

    test('a service without a set duration uses 15 minutes', async function () {
        const first = await request(app).post('/api/queue/join').send(joinRequest("a@email.com", "Library Help"));
        await request(app).post('/api/queue/join').send(joinRequest("b@email.com", "Library Help"));
        await request(app).post('/api/queue/join').send(joinRequest("c@email.com", "Library Help"));

        await request(app).post('/api/queue/leave').send({ queueId: first.body.data.id });
        const status = await request(app).get('/api/queue/status');

        expect(status.body.queue[1].position).toBe(2);
        expect(status.body.queue[1].estimatedWaitTime).toBe(15);
    });

    test('the next person is told it is almost their turn', async function () {
        const first = await request(app).post('/api/queue/join').send(joinRequest("a@email.com", "Academic Advising"));
        await request(app).post('/api/queue/join').send(joinRequest("b@email.com", "Academic Advising"));
        await request(app).post('/api/queue/join').send(joinRequest("c@email.com", "Academic Advising"));

        expect(await getMessages("c@email.com")).toEqual([
            "You joined the Academic Advising queue. You are #3. Estimated wait: 60 minutes."
        ]);

        await request(app).post('/api/queue/leave').send({ queueId: first.body.data.id });

        expect(await getMessages("c@email.com")).toEqual([
            "It's almost your turn! You are #2 in the Academic Advising queue.",
            "You joined the Academic Advising queue. You are #3. Estimated wait: 60 minutes."
        ]);
    });
});
