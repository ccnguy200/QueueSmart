// Notification Module
// Saves a notification in the database when a user joins a queue and when they are close to being served
const express = require('express');
const router = express.Router();
const { NotificationHistory, UserCredentials } = require('../tables');

// Send "almost your turn" at this position or closer (same as the Queue Status page)
const NOTIFY_AT_POSITION = 2;

// Longest user name we accept (same as the NotificationHistory table)
const MAX_USER_NAME_LENGTH = 100;

// The two kinds of notifications (the table also keeps "history" records for the History page)
const NOTIFICATION_TYPES = ["joined", "almost"];

// Notifications are saved one after another, in the order they happen
// "saving" is the newest save, the GET route waits for it so it never misses one
let saving = Promise.resolve();

// Turn a date into a time like "9:05 AM"
function formatTime(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = "AM";

    if (hours >= 12) {
        ampm = "PM";
    }
    hours = hours % 12;
    if (hours === 0) {
        hours = 12;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }

    return hours + ":" + minutes + " " + ampm;
}

// The day in front of the time ("Nov 4, "), or "" when the date is today
// so older notifications do not look like they came today
function formatDay(date) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();

    if (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()) {
        return "";
    }
    return months[date.getMonth()] + " " + date.getDate() + ", ";
}

// Check a user name
// Returns an error message, or "" if the user name is fine
function checkUserName(userName) {
    if (userName === undefined || userName === null) {
        return "userName is required.";
    }
    if (typeof userName !== "string") {
        return "userName must be text.";
    }
    if (userName.trim() === "") {
        return "userName is required.";
    }
    if (userName.length > MAX_USER_NAME_LENGTH) {
        return "userName must be " + MAX_USER_NAME_LENGTH + " characters or less.";
    }
    return "";
}

// Save a new notification in the database and log it
// Returns the saved notification, or null if it is not valid
async function addNotification(userName, type, message, queueEntryId) {
    if (checkUserName(userName) !== "") {
        return null;
    }

    try {
        // link it to the user's account if they have one
        let userId = null;
        const user = await UserCredentials.findOne({ where: { email: userName } });
        if (user !== null) {
            userId = user.id;
        }

        const notification = await NotificationHistory.create({
            userId: userId,
            userName: userName,
            type: type,
            message: message,
            queueEntryId: queueEntryId
        });

        console.log("Notification for " + userName + ": " + message);
        return notification;
    } catch (err) {
        // the table's validation did not accept it (for example, the message is too long)
        return null;
    }
}

// Trigger 1: the user joined a queue
// entry is the queue entry from the Queue Management module
async function saveJoined(entry) {
    if (!entry || typeof entry.service !== "string" || entry.service === "") {
        return null;
    }

    let message = "You joined the " + entry.service + " queue.";
    if (typeof entry.position === "number") {
        message = message + " You are #" + entry.position + ".";
    }
    if (typeof entry.estimatedWaitTime === "number") {
        message = message + " Estimated wait: " + entry.estimatedWaitTime + " minutes.";
    }

    return addNotification(entry.userName, "joined", message, entry.id);
}

// Trigger 2: users who are close to being served
// For every waiting entry, count the waiting people ahead of it in the same service
// (a smaller position number, or the same number but earlier in the list),
// and notify it once when it reaches NOTIFY_AT_POSITION or closer
// Returns how many notifications were made
async function saveAlmost(queue) {
    if (!Array.isArray(queue)) {
        return 0;
    }

    let made = 0;

    for (let i = 0; i < queue.length; i++) {
        const entry = queue[i];

        if (entry.status === "waiting") {
            let position = 1;
            for (let j = 0; j < queue.length; j++) {
                if (j !== i && queue[j].service === entry.service && queue[j].status === "waiting") {
                    if (queue[j].position < entry.position) {
                        position++;
                    } else if (queue[j].position === entry.position && j < i) {
                        position++;
                    }
                }
            }

            if (position <= NOTIFY_AT_POSITION) {
                // only once per queue entry
                const alreadySent = await NotificationHistory.count({
                    where: { queueEntryId: entry.id, type: "almost" }
                });

                if (alreadySent === 0) {
                    let message = "It's almost your turn! You are #" + position + " in the " + entry.service + " queue.";
                    if (position === 1) {
                        message = "It's almost your turn! You are next in the " + entry.service + " queue.";
                    }

                    if (await addNotification(entry.userName, "almost", message, entry.id) !== null) {
                        made++;
                    }
                }
            }
        }
    }

    return made;
}

// Called by the Queue Management module after a user joins
// (if a save fails, it is skipped so the next saves still happen)
function notifyJoined(entry) {
    saving = saving.then(function () {
        return saveJoined(entry);
    }).catch(function () {
        return null;
    });
    return saving;
}

// Called by the Queue Management module after the queue changes (someone joins, leaves, or is served)
function checkQueue(queue) {
    saving = saving.then(function () {
        return saveAlmost(queue);
    }).catch(function () {
        return 0;
    });
    return saving;
}

// route: get a user's notifications, newest first
// GET /api/notifications?userName=user@email.com
// Reading does not change the status: 'sent' becomes 'viewed' when the user opens them in the bell list
async function getNotifications(req, res) {
    const userName = req.query.userName;

    const error = checkUserName(userName);
    if (error !== "") {
        return res.status(400).json({
            success: false,
            message: error
        });
    }

    try {
        // wait for notifications that are still being saved
        await saving;

        const rows = await NotificationHistory.findAll({
            where: { userName: userName, type: NOTIFICATION_TYPES },
            order: [['id', 'DESC']]
        });

        const list = [];
        for (let i = 0; i < rows.length; i++) {
            list.push({
                id: rows[i].id,
                type: rows[i].type,
                message: rows[i].message,
                status: rows[i].status,
                queueEntryId: rows[i].queueEntryId,
                timestamp: rows[i].timestamp,
                time: formatDay(rows[i].timestamp) + formatTime(rows[i].timestamp)
            });
        }

        return res.json({
            success: true,
            notifications: list
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
}

// The userName sent in the body of a POST request (undefined if there is no body)
function bodyUserName(req) {
    if (!req.body) {
        return undefined;
    }
    return req.body.userName;
}

// route: mark one notification as viewed (the user clicked it in the bell list)
// POST /api/notifications/5/viewed   body: { userName: "user@email.com" }
async function markOneViewed(req, res) {
    const userName = bodyUserName(req);

    const error = checkUserName(userName);
    if (error !== "") {
        return res.status(400).json({
            success: false,
            message: error
        });
    }

    try {
        // only the user's own notifications (not history records)
        const notification = await NotificationHistory.findOne({
            where: { id: req.params.id, userName: userName, type: NOTIFICATION_TYPES }
        });

        if (notification === null) {
            return res.status(404).json({
                success: false,
                message: "Notification was not found."
            });
        }

        notification.status = "viewed";
        await notification.save();

        return res.json({
            success: true
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
}

// route: mark all of a user's notifications as viewed ("Mark all read" in the bell list)
// POST /api/notifications/viewed   body: { userName: "user@email.com" }
async function markAllViewed(req, res) {
    const userName = bodyUserName(req);

    const error = checkUserName(userName);
    if (error !== "") {
        return res.status(400).json({
            success: false,
            message: error
        });
    }

    try {
        const result = await NotificationHistory.update(
            { status: "viewed" },
            { where: { userName: userName, type: NOTIFICATION_TYPES, status: "sent" } }
        );

        return res.json({
            success: true,
            updated: result[0]
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
}

router.get('/', getNotifications);
router.post('/viewed', markAllViewed);
router.post('/:id/viewed', markOneViewed);

module.exports = {
    router: router,
    notifyJoined: notifyJoined,
    checkQueue: checkQueue,
    addNotification: addNotification,
    checkUserName: checkUserName,
    formatTime: formatTime,
    formatDay: formatDay
};
