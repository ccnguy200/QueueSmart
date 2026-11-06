// Notification bell in the header of the user pages
// A red number shows how many notifications are new, click the bell to see them
// When it is almost the user's turn, a banner also shows under the header

// Check for new notifications every 15 seconds
const BELL_CHECK_EVERY = 15000;

// Show the "almost your turn" banner at this position or closer (same as the Queue Status page)
const BANNER_AT_POSITION = 2;

// The user's notifications from the backend, newest first
let bellNotifications = [];

// The queue from the backend (the banner only shows while the user is really near the front)
let bellQueue = [];

// Put the bell in the header, just before the Logout link
function addBell() {
    const userName = sessionStorage.getItem("userName");
    const logout = document.querySelector('nav a[href="login.html"]');

    // Nobody is logged in (or the page has no Logout link): no bell
    if (userName === null || logout === null) {
        return;
    }

    const item = document.createElement("li");
    item.className = "bell";
    item.innerHTML =
        '<button type="button" class="bell-button" aria-label="Notifications" aria-expanded="false" onclick="toggleBell()">' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>' +
            '</svg>' +
            '<span class="bell-count" id="bell-count" hidden></span>' +
        '</button>' +
        '<div class="bell-panel" id="bell-panel" hidden>' +
            '<div class="bell-head">' +
                '<strong>Notifications <span class="bell-unread" id="bell-unread"></span></strong>' +
                '<button type="button" class="bell-read-all" id="bell-read-all" onclick="markAllRead()">Mark all read</button>' +
            '</div>' +
            '<ul class="bell-list" id="bell-list"></ul>' +
            '<a class="bell-all" href="user_dashboard.html#notifications" onclick="closeBell()">View all notifications</a>' +
        '</div>';

    // The Logout link is inside an <li>, the bell goes in front of it
    const logoutItem = logout.parentElement;
    logoutItem.parentElement.insertBefore(item, logoutItem);

    // Banner for "almost your turn"
    // (not on Queue Status, that page has its own "Almost your turn!" card)
    if (window.location.pathname.indexOf("queue_status.html") === -1) {
        const banner = document.createElement("div");
        banner.className = "turn-banner";
        banner.id = "turn-banner";
        banner.hidden = true;
        banner.innerHTML =
            '<span class="turn-text" id="turn-text"></span>' +
            '<button type="button" class="btn" id="turn-view">View status</button>' +
            '<button type="button" class="turn-close" id="turn-close" aria-label="Dismiss">&times;</button>';
        // right under the top bar (the <header>; on the calendar page the top bar also has the page title)
        const topBar = logoutItem.closest("nav").parentElement;
        topBar.parentElement.insertBefore(banner, topBar.nextSibling);
    }

    loadBell();
    setInterval(loadBell, BELL_CHECK_EVERY);
}

// Open or close the list
function toggleBell() {
    const panel = document.getElementById("bell-panel");
    const button = document.querySelector(".bell-button");
    panel.hidden = !panel.hidden;

    // Tell screen readers if the list is open
    if (panel.hidden) {
        button.setAttribute("aria-expanded", "false");
    } else {
        button.setAttribute("aria-expanded", "true");
    }

    // On a phone the list goes right under the top bar
    if (window.innerWidth <= 640) {
        panel.style.top = (document.querySelector("nav").parentElement.getBoundingClientRect().bottom + 8) + "px";
    }
}

// Close the list if it is open (click outside, Escape, or View all notifications)
function closeBell() {
    const panel = document.getElementById("bell-panel");
    if (panel !== null && !panel.hidden) {
        toggleBell();
    }
}

// Ask the backend for the user's notifications and the queue
async function loadBell() {
    const userName = sessionStorage.getItem("userName");

    try {
        const response = await fetch("/api/notifications?userName=" + encodeURIComponent(userName));
        const data = await response.json();

        const queueResponse = await fetch("/api/queue/status");
        const queueData = await queueResponse.json();

        if (!response.ok || !data.success) {
            return;
        }

        bellNotifications = data.notifications;
        if (queueResponse.ok && queueData.success) {
            bellQueue = queueData.queue;
        }
        showBell();
    } catch (err) {
        console.log("Could not load notifications.");
    }
}

// Show the red number and build the list (new ones are highlighted)
function showBell() {
    // "sent" means the user has not read it yet
    let unread = 0;
    for (let i = 0; i < bellNotifications.length; i++) {
        if (bellNotifications[i].status === "sent") {
            unread++;
        }
    }

    const count = document.getElementById("bell-count");
    const unreadText = document.getElementById("bell-unread");
    const readAll = document.getElementById("bell-read-all");

    if (unread === 0) {
        count.hidden = true;
        unreadText.innerText = "";
        readAll.hidden = true;
    } else {
        count.hidden = false;
        if (unread > 9) {
            count.innerText = "9+";
        } else {
            count.innerText = unread;
        }
        unreadText.innerText = "(" + unread + " unread)";
        readAll.hidden = false;
    }

    showNotificationList(document.getElementById("bell-list"), "bell-empty");

    // The dashboard's Notifications Summary card ("View all notifications") shows the same list
    const summary = document.querySelector("#notifications .updates");
    if (summary !== null) {
        showNotificationList(summary, "");
    }

    showTurnBanner();
}

// Fill a list with the user's notifications (used by the bell and by the dashboard card)
function showNotificationList(list, emptyClass) {
    list.innerHTML = "";

    if (bellNotifications.length === 0) {
        const empty = document.createElement("li");
        empty.className = emptyClass;
        empty.innerText = "No notifications yet.";
        list.appendChild(empty);
    }

    for (let i = 0; i < bellNotifications.length; i++) {
        list.appendChild(makeBellItem(bellNotifications[i]));
    }
}

// One notification in a list: new ones are highlighted
function makeBellItem(notification) {
    const item = document.createElement("li");
    item.className = "bell-item";
    if (notification.status === "sent") {
        item.className = "bell-item unread";
    }

    const message = document.createElement("div");
    message.innerText = notification.message;
    item.appendChild(message);

    const time = document.createElement("div");
    time.className = "time";
    time.innerText = notification.time;
    item.appendChild(time);

    // Clicking a notification marks it read and opens the Queue Status page
    item.onclick = function () {
        openNotification(notification.id);
    };

    // The keyboard can reach it with Tab and open it with Enter
    item.tabIndex = 0;
    item.onkeydown = function (event) {
        if (event.key === "Enter") {
            openNotification(notification.id);
        }
    };

    return item;
}

// Show the "almost your turn" banner from the user's place in line right now
// (only while that queue entry is still waiting near the front, with its current position)
function showTurnBanner() {
    const banner = document.getElementById("turn-banner");
    if (banner === null) {
        return;
    }

    // The newest unread "almost your turn" whose queue entry is still waiting near the front
    let almost = null;
    let entry = null;
    for (let i = 0; i < bellNotifications.length; i++) {
        const notification = bellNotifications[i];
        if (almost === null && notification.type === "almost" && notification.status === "sent") {
            for (let j = 0; j < bellQueue.length; j++) {
                if (bellQueue[j].id === notification.queueEntryId && bellQueue[j].status === "waiting" && bellQueue[j].position <= BANNER_AT_POSITION) {
                    almost = notification;
                    entry = bellQueue[j];
                }
            }
        }
    }

    if (almost === null) {
        banner.hidden = true;
        return;
    }

    // #1 is the person being called (the same as the Now Serving screen)
    let text = "It's almost your turn! You are #" + entry.position + " in the " + entry.service + " queue.";
    if (entry.position === 1) {
        text = "It's your turn! Please go to the " + entry.service + " desk now.";
    }
    document.getElementById("turn-text").innerText = text;

    // View status: mark it read and open that queue's Queue Status page
    document.getElementById("turn-view").onclick = function () {
        openNotification(almost.id, entry.service);
    };

    // x: mark it read and hide the banner
    document.getElementById("turn-close").onclick = function () {
        dismissNotification(almost.id);
    };

    banner.hidden = false;
}

// Mark one notification as read in the backend
async function markViewed(id) {
    const userName = sessionStorage.getItem("userName");

    try {
        await fetch("/api/notifications/" + id + "/viewed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userName: userName })
        });
    } catch (err) {
        console.log("Could not mark the notification as read.");
    }
}

// Mark one notification as read and stay on the page
async function dismissNotification(id) {
    await markViewed(id);
    loadBell();
}

// Mark one notification as read, then go to the Queue Status page
// service: open that queue's page (without it, the page finds the user's queue)
async function openNotification(id, service) {
    await markViewed(id);

    if (service === undefined) {
        window.location.href = "queue_status.html";
    } else {
        window.location.href = "queue_status.html?service=" + encodeURIComponent(service);
    }
}

// Mark all of the user's notifications as read
async function markAllRead() {
    const userName = sessionStorage.getItem("userName");

    try {
        await fetch("/api/notifications/viewed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userName: userName })
        });
    } catch (err) {
        console.log("Could not mark the notifications as read.");
    }

    loadBell();
}

// Clicking anywhere outside the bell closes the list
document.addEventListener("click", function (event) {
    if (event.target.closest(".bell") === null) {
        closeBell();
    }
});

// Escape closes the list and goes back to the bell (like the pop-ups in popup.js)
document.addEventListener("keydown", function (event) {
    const panel = document.getElementById("bell-panel");
    if (event.key === "Escape" && panel !== null && !panel.hidden) {
        closeBell();
        document.querySelector(".bell-button").focus();
    }
});

// Add the bell when the page has loaded
window.addEventListener("DOMContentLoaded", addBell);
