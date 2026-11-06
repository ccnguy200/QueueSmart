// Unit tests for the Notification Module (routes/notifications.js) and the NotificationHistory table
const request = require('supertest');
const app = require('../server');
const notifications = require('../routes/notifications');
const { sequelize, NotificationHistory, UserCredentials } = require('../tables');

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

// Get a user's notification messages from the API (newest first)
async function getMessages(userName) {
    const response = await request(app).get('/api/notifications').query({ userName: userName });
    const messages = [];
    for (let i = 0; i < response.body.notifications.length; i++) {
        messages.push(response.body.notifications[i].message);
    }
    return messages;
}

// Every test starts with an empty database
beforeEach(async function () {
    await sequelize.sync({ force: true });
    jest.spyOn(console, 'log').mockImplementation(function () {});
});

afterEach(function () {
    jest.restoreAllMocks();
});

afterAll(async function () {
    await sequelize.close();
});

describe('formatTime', function () {
    test('morning and afternoon times', function () {
        expect(notifications.formatTime(new Date(2026, 9, 9, 9, 5))).toBe("9:05 AM");
        expect(notifications.formatTime(new Date(2026, 9, 9, 13, 30))).toBe("1:30 PM");
    });

    test('midnight and noon show 12', function () {
        expect(notifications.formatTime(new Date(2026, 9, 9, 0, 0))).toBe("12:00 AM");
        expect(notifications.formatTime(new Date(2026, 9, 9, 12, 0))).toBe("12:00 PM");
    });
});

describe('formatDay', function () {
    test('today has no day in front of the time', function () {
        expect(notifications.formatDay(new Date())).toBe("");
    });

    test('an older date shows the month and day', function () {
        expect(notifications.formatDay(new Date(2026, 9, 9, 9, 5))).toBe("Oct 9, ");
    });
});

describe('checkUserName (validation)', function () {
    test('userName is required', function () {
        expect(notifications.checkUserName(undefined)).toBe("userName is required.");
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
});

describe('NotificationHistory table', function () {
    test('a new notification is saved as "sent" with a timestamp', async function () {
        const saved = await NotificationHistory.create({ userName: "a@email.com", type: "joined", message: "Hello" });
        const found = await NotificationHistory.findByPk(saved.id);

        expect(found.status).toBe("sent");
        expect(found.timestamp).toBeInstanceOf(Date);
    });

    test('the table rejects missing or bad fields', async function () {
        await expect(NotificationHistory.create({ userName: "a@email.com", type: "joined" })).rejects.toThrow();
        await expect(NotificationHistory.create({ userName: "a@email.com", type: "joined", message: "" })).rejects.toThrow();
        await expect(NotificationHistory.create({ userName: "a@email.com", type: "joined", message: "a".repeat(256) })).rejects.toThrow();
        await expect(NotificationHistory.create({ userName: "a".repeat(101), type: "joined", message: "Hello" })).rejects.toThrow();
        await expect(NotificationHistory.create({ userName: "a@email.com", type: "other", message: "Hello" })).rejects.toThrow();
        await expect(NotificationHistory.create({ userName: "a@email.com", type: "joined", message: "Hello", status: "read" })).rejects.toThrow();
        expect(await NotificationHistory.count()).toBe(0);
    });
});

describe('addNotification', function () {
    test('saves the notification in the database and logs it', async function () {
        await notifications.addNotification("a@email.com", "joined", "Hello");

        const rows = await NotificationHistory.findAll();
        expect(rows.length).toBe(1);
        expect(rows[0].message).toBe("Hello");
        expect(console.log).toHaveBeenCalledWith("Notification for a@email.com: Hello");
    });

    test('links the notification to the user account when there is one', async function () {
        const user = await UserCredentials.create({ email: "a@email.com", password: "hashed", role: "user" });

        const withAccount = await notifications.addNotification("a@email.com", "joined", "Hello");
        const noAccount = await notifications.addNotification("Mary Jane", "joined", "Hello");

        expect(withAccount.userId).toBe(user.id);
        expect(noAccount.userId).toBe(null);
    });

    test('returns null and saves nothing when something is not valid', async function () {
        expect(await notifications.addNotification("", "joined", "Hello")).toBe(null);
        expect(await notifications.addNotification("a@email.com", "joined", "")).toBe(null);
        expect(await NotificationHistory.count()).toBe(0);
    });
});

describe('notifyJoined (trigger 1: user joins a queue)', function () {
    test('makes a "joined" notification with the position and wait', async function () {
        const entry = makeEntry("a@email.com", "Financial Aid Office", "waiting");
        entry.position = 2;
        entry.estimatedWaitTime = 24;

        const saved = await notifications.notifyJoined(entry);

        expect(saved.type).toBe("joined");
        expect(saved.message).toBe("You joined the Financial Aid Office queue. You are #2. Estimated wait: 24 minutes.");
    });

    test('does nothing for a missing entry or service', async function () {
        expect(await notifications.notifyJoined(undefined)).toBe(null);
        expect(await notifications.notifyJoined({ userName: "a@email.com" })).toBe(null);
        expect(await NotificationHistory.count()).toBe(0);
    });
});

describe('checkQueue (trigger 2: user is close to being served)', function () {
    test('notifies positions 1 and 2, but not 3', async function () {
        const queue = [
            makeEntry("a@email.com", "Academic Advising", "waiting"),
            makeEntry("b@email.com", "Academic Advising", "waiting"),
            makeEntry("c@email.com", "Academic Advising", "waiting")
        ];

        expect(await notifications.checkQueue(queue)).toBe(2);
        expect(await getMessages("a@email.com")).toEqual(["It's almost your turn! You are next in the Academic Advising queue."]);
        expect(await getMessages("b@email.com")).toEqual(["It's almost your turn! You are #2 in the Academic Advising queue."]);
        expect(await getMessages("c@email.com")).toEqual([]);
    });

    test('counts by position number, not by the order of the list', async function () {
        const queue = [
            makeEntry("a@email.com", "Academic Advising", "waiting"),
            makeEntry("b@email.com", "Academic Advising", "waiting"),
            makeEntry("c@email.com", "Academic Advising", "waiting")
        ];
        queue[0].position = 3;
        queue[1].position = 1;
        queue[2].position = 2;

        expect(await notifications.checkQueue(queue)).toBe(2);
        expect(await getMessages("b@email.com")).toEqual(["It's almost your turn! You are next in the Academic Advising queue."]);
        expect(await getMessages("c@email.com")).toEqual(["It's almost your turn! You are #2 in the Academic Advising queue."]);
        expect(await getMessages("a@email.com")).toEqual([]);
    });

    test('notifies each entry only once', async function () {
        const queue = [makeEntry("a@email.com", "Academic Advising", "waiting")];

        expect(await notifications.checkQueue(queue)).toBe(1);
        expect(await notifications.checkQueue(queue)).toBe(0);
    });

    test('each service has its own line, and people who are not waiting do not count', async function () {
        const queue = [
            makeEntry("a@email.com", "Academic Advising", "served"),
            makeEntry("b@email.com", "Academic Advising", "waiting"),
            makeEntry("c@email.com", "Academic Advising", "waiting"),
            makeEntry("d@email.com", "Tutoring Services", "waiting")
        ];

        expect(await notifications.checkQueue(queue)).toBe(3);
        expect(await getMessages("a@email.com")).toEqual([]);
    });

    test('returns 0 if the queue is not a list', async function () {
        expect(await notifications.checkQueue(undefined)).toBe(0);
    });

    test('if one save fails, the next notifications are still saved', async function () {
        jest.spyOn(NotificationHistory, 'count').mockRejectedValueOnce(new Error("database is busy"));

        expect(await notifications.checkQueue([makeEntry("a@email.com", "Academic Advising", "waiting")])).toBe(0);
        expect(await notifications.notifyJoined(makeEntry("b@email.com", "Academic Advising", "waiting"))).not.toBe(null);
        expect(await getMessages("b@email.com")).toEqual(["You joined the Academic Advising queue. You are #1. Estimated wait: 0 minutes."]);
    });
});

describe('GET /api/notifications', function () {
    test('400 when userName is missing, given twice, or too long', async function () {
        const missing = await request(app).get('/api/notifications');
        const twice = await request(app).get('/api/notifications?userName=a&userName=b');
        const tooLong = await request(app).get('/api/notifications').query({ userName: "a".repeat(101) });

        expect(missing.status).toBe(400);
        expect(missing.body).toEqual({ success: false, message: "userName is required." });
        expect(twice.body.message).toBe("userName must be text.");
        expect(tooLong.body.message).toBe("userName must be 100 characters or less.");
    });

    test('a user with no notifications gets an empty list', async function () {
        const response = await request(app).get('/api/notifications').query({ userName: "new@email.com" });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, notifications: [] });
    });

    test('newest first, only the user\'s own, and reading does not change "sent"', async function () {
        await notifications.addNotification("a@email.com", "joined", "First");
        await notifications.addNotification("a@email.com", "almost", "Second");
        await notifications.addNotification("b@email.com", "joined", "Not mine");

        const firstRead = await request(app).get('/api/notifications').query({ userName: "a@email.com" });
        const secondRead = await request(app).get('/api/notifications').query({ userName: "a@email.com" });

        expect(firstRead.body.notifications.length).toBe(2);
        expect(firstRead.body.notifications[0].message).toBe("Second");
        expect(firstRead.body.notifications[0].status).toBe("sent");
        expect(firstRead.body.notifications[0].time).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
        expect(secondRead.body.notifications[0].status).toBe("sent");
        expect(await NotificationHistory.count({ where: { userName: "b@email.com", status: "sent" } })).toBe(1);
    });

    test('history records in the same table are not shown as notifications', async function () {
        await notifications.addNotification("a@email.com", "joined", "Hello");
        await NotificationHistory.create({ userName: "a@email.com", type: "history", message: "a@email.com was Served from the Tutoring Services queue." });

        expect(await getMessages("a@email.com")).toEqual(["Hello"]);
        expect(await NotificationHistory.count({ where: { type: "history", status: "sent" } })).toBe(1);
    });

    test('500 when the database is not working', async function () {
        jest.spyOn(NotificationHistory, 'findAll').mockRejectedValue(new Error("database is down"));

        const response = await request(app).get('/api/notifications').query({ userName: "a@email.com" });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
    });
});

describe('POST /api/notifications/viewed and /api/notifications/:id/viewed', function () {
    test('400 when userName is missing', async function () {
        const all = await request(app).post('/api/notifications/viewed');
        const one = await request(app).post('/api/notifications/1/viewed').send({});

        expect(all.status).toBe(400);
        expect(all.body).toEqual({ success: false, message: "userName is required." });
        expect(one.status).toBe(400);
    });

    test('one notification: only that one becomes "viewed"', async function () {
        const first = await notifications.addNotification("a@email.com", "joined", "First");
        await notifications.addNotification("a@email.com", "almost", "Second");

        const response = await request(app).post('/api/notifications/' + first.id + '/viewed').send({ userName: "a@email.com" });

        expect(response.status).toBe(200);
        expect((await NotificationHistory.findByPk(first.id)).status).toBe("viewed");
        expect(await NotificationHistory.count({ where: { userName: "a@email.com", status: "sent" } })).toBe(1);
    });

    test('404 for someone else\'s notification, a history record, or a wrong id', async function () {
        const mine = await notifications.addNotification("a@email.com", "joined", "Mine");
        const record = await NotificationHistory.create({ userName: "b@email.com", type: "history", message: "b@email.com was Served from the Tutoring Services queue." });

        const other = await request(app).post('/api/notifications/' + mine.id + '/viewed').send({ userName: "b@email.com" });
        const history = await request(app).post('/api/notifications/' + record.id + '/viewed').send({ userName: "b@email.com" });
        const wrong = await request(app).post('/api/notifications/999/viewed').send({ userName: "a@email.com" });

        expect(other.status).toBe(404);
        expect(history.status).toBe(404);
        expect(wrong.status).toBe(404);
        expect((await NotificationHistory.findByPk(mine.id)).status).toBe("sent");
    });

    test('all: every "sent" notification of the user becomes "viewed"', async function () {
        await notifications.addNotification("a@email.com", "joined", "First");
        await notifications.addNotification("a@email.com", "almost", "Second");
        await notifications.addNotification("b@email.com", "joined", "Not mine");

        const response = await request(app).post('/api/notifications/viewed').send({ userName: "a@email.com" });

        expect(response.body).toEqual({ success: true, updated: 2 });
        expect(await NotificationHistory.count({ where: { userName: "a@email.com", status: "viewed" } })).toBe(2);
        expect(await NotificationHistory.count({ where: { userName: "b@email.com", status: "sent" } })).toBe(1);
    });

    test('500 when the database is not working', async function () {
        jest.spyOn(NotificationHistory, 'update').mockRejectedValue(new Error("database is down"));
        jest.spyOn(NotificationHistory, 'findOne').mockRejectedValue(new Error("database is down"));

        const all = await request(app).post('/api/notifications/viewed').send({ userName: "a@email.com" });
        const one = await request(app).post('/api/notifications/1/viewed').send({ userName: "a@email.com" });

        expect(all.status).toBe(500);
        expect(one.status).toBe(500);
    });
});

describe('joining and leaving a queue send notifications', function () {
    test('the first person gets "joined" and "almost your turn"', async function () {
        const join = await request(app).post('/api/queue/join').send(joinRequest("a@email.com", "Financial Aid Office"));

        expect(join.status).toBe(201);
        expect(await getMessages("a@email.com")).toEqual([
            "It's almost your turn! You are next in the Financial Aid Office queue.",
            "You joined the Financial Aid Office queue. You are #1. Estimated wait: 0 minutes."
        ]);
    });

    test('the third person only gets "joined", then "almost" after someone leaves', async function () {
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

    test('after the admin moves someone up, the right person gets "almost your turn"', async function () {
        await request(app).post('/api/queue/join').send(joinRequest("a@email.com", "Financial Aid Office"));
        await request(app).post('/api/queue/join').send(joinRequest("b@email.com", "Financial Aid Office"));
        await request(app).post('/api/queue/join').send(joinRequest("c@email.com", "Financial Aid Office"));
        const last = await request(app).post('/api/queue/join').send(joinRequest("d@email.com", "Financial Aid Office"));

        await request(app).post('/api/admin/queue/reorder').send({ queueId: last.body.data.id, direction: "up" });
        await request(app).post('/api/admin/queue/reorder').send({ queueId: last.body.data.id, direction: "up" });
        await request(app).post('/api/admin/queue/serve').send({ service: "Financial Aid Office" });

        expect(await getMessages("d@email.com")).toContain("It's almost your turn! You are next in the Financial Aid Office queue.");
        const others = await getMessages("c@email.com");
        expect(others.length).toBe(1);
        expect(others[0]).toContain("You are #3.");
    });

    test('the notifications are saved in the NotificationHistory table', async function () {
        const join = await request(app).post('/api/queue/join').send(joinRequest("a@email.com", "Tutoring Services"));
        await getMessages("a@email.com");

        const rows = await NotificationHistory.findAll({ where: { userName: "a@email.com" } });

        expect(rows.length).toBe(2);
        expect(rows[0].queueEntryId).toBe(join.body.data.id);
        expect(rows[0].status).toBe("sent");

        const response = await request(app).get('/api/notifications').query({ userName: "a@email.com" });
        expect(response.body.notifications[0].queueEntryId).toBe(join.body.data.id);
    });
});
