// Notification Module
// Makes a notification when a user joins a queue and when they are close to being served
// Note: no database yet, notifications are kept in memory while the server is running
const express = require('express');
const router = express.Router();

// Send "almost your turn" at this position or closer (same as the Queue Status page)
const NOTIFY_AT_POSITION = 2;

// Longest user name we accept
const MAX_USER_NAME_LENGTH = 100;

// In-memory storage: every notification made so far
let notifications = [];

// Queue entries that already got the "almost your turn" notification
let almostNotified = [];

// Id for the next notification
let nextId = 1;

// Mock data: notifications the default user already has (same as the A2 dashboard)
function addMockNotifications() {
    const mock = [
        ["calendar", "Your Financial Aid Office appointment on October 25 at 1:00 PM is confirmed.", "9:00 AM"],
        ["location", "You are within range of Student Service Center 1.", "10:01 AM"],
        ["status", "Your status changed to: Waiting.", "10:02 AM"],
        ["position", "Your position in the Academic Advising queue is now #3.", "10:05 AM"]
    ];

    for (let i = 0; i < mock.length; i++) {
        notifications.push({
            id: nextId,
            userName: "user@email.com",
            type: mock[i][0],
            message: mock[i][1],
            time: mock[i][2]
        });
        nextId++;
    }
}

// Start over with only the mock notifications (also used by the unit tests)
function resetNotifications() {
    notifications = [];
    almostNotified = [];
    nextId = 1;
    addMockNotifications();
}

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

// Save a new notification and log it
// Returns the notification, or null if the user name or message is not valid
function addNotification(userName, type, message) {
    if (checkUserName(userName) !== "") {
        return null;
    }
    if (typeof message !== "string" || message.trim() === "") {
        return null;
    }

    const notification = {
        id: nextId,
        userName: userName,
        type: type,
        message: message,
        time: formatTime(new Date())
    };
    nextId++;

    notifications.push(notification);
    console.log("Notification for " + userName + ": " + message);

    return notification;
}

// Trigger 1: the user joined a queue
// entry is the queue entry from the Queue Management module
function notifyJoined(entry) {
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

    return addNotification(entry.userName, "joined", message);
}

// true if this queue entry already got the "almost your turn" notification
function wasAlmostNotified(entry) {
    for (let i = 0; i < almostNotified.length; i++) {
        if (almostNotified[i] === entry) {
            return true;
        }
    }
    return false;
}

// Trigger 2: users who are close to being served
// For every waiting entry, count the waiting people ahead of it in the same service
// (they joined earlier), and notify it once when it reaches NOTIFY_AT_POSITION or closer
// Call this after the queue changes (someone joins, leaves, or is served)
// Returns how many notifications were made
function checkQueue(queue) {
    if (!Array.isArray(queue)) {
        return 0;
    }

    let made = 0;

    for (let i = 0; i < queue.length; i++) {
        const entry = queue[i];

        if (entry.status === "waiting" && !wasAlmostNotified(entry)) {
            let position = 1;
            for (let j = 0; j < i; j++) {
                if (queue[j].service === entry.service && queue[j].status === "waiting") {
                    position++;
                }
            }

            if (position <= NOTIFY_AT_POSITION) {
                let message = "It's almost your turn! You are #" + position + " in the " + entry.service + " queue.";
                if (position === 1) {
                    message = "It's almost your turn! You are next in the " + entry.service + " queue.";
                }

                if (addNotification(entry.userName, "almost", message) !== null) {
                    almostNotified.push(entry);
                    made++;
                }
            }
        }
    }

    return made;
}

// route: get a user's notifications, newest first
// GET /api/notifications?userName=user@email.com
function getNotifications(req, res) {
    const userName = req.query.userName;

    const error = checkUserName(userName);
    if (error !== "") {
        return res.status(400).json({
            success: false,
            message: error
        });
    }

    const list = [];
    for (let i = notifications.length - 1; i >= 0; i--) {
        if (notifications[i].userName === userName) {
            list.push(notifications[i]);
        }
    }

    return res.json({
        success: true,
        notifications: list
    });
}

router.get('/', getNotifications);

resetNotifications();

module.exports = {
    router: router,
    notifyJoined: notifyJoined,
    checkQueue: checkQueue,
    addNotification: addNotification,
    checkUserName: checkUserName,
    formatTime: formatTime,
    resetNotifications: resetNotifications
};
