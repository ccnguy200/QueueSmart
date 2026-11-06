// Notification bell in the header of the user pages
// A red number shows how many notifications are new, click the bell to see them

// Check for new notifications every 15 seconds
const BELL_CHECK_EVERY = 15000;

// The user's notifications from the backend, newest first
let bellNotifications = [];

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
        '<button type="button" class="bell-button" aria-label="Notifications" onclick="toggleBell()">' +
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
            '<a class="bell-all" href="user_dashboard.html#notifications">View all notifications</a>' +
        '</div>';

    // The Logout link is inside an <li>, the bell goes in front of it
    const logoutItem = logout.parentElement;
    logoutItem.parentElement.insertBefore(item, logoutItem);

    loadBell();
    setInterval(loadBell, BELL_CHECK_EVERY);
}

// Open or close the list
function toggleBell() {
    const panel = document.getElementById("bell-panel");
    panel.hidden = !panel.hidden;

    // On a phone the list goes right under the header
    if (window.innerWidth <= 640) {
        panel.style.top = (document.querySelector("header").getBoundingClientRect().bottom + 8) + "px";
    }
}

// Ask the backend for the user's notifications
async function loadBell() {
    const userName = sessionStorage.getItem("userName");

    try {
        const response = await fetch("/api/notifications?userName=" + encodeURIComponent(userName));
        const data = await response.json();

        if (!response.ok || !data.success) {
            return;
        }

        bellNotifications = data.notifications;
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

    const list = document.getElementById("bell-list");
    list.innerHTML = "";

    if (bellNotifications.length === 0) {
        const empty = document.createElement("li");
        empty.className = "bell-empty";
        empty.innerText = "No notifications yet.";
        list.appendChild(empty);
    }

    for (let i = 0; i < bellNotifications.length; i++) {
        const notification = bellNotifications[i];

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

        list.appendChild(item);
    }
}

// Mark one notification as read, then go to the Queue Status page
async function openNotification(id) {
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

    window.location.href = "queue_status.html";
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
    const panel = document.getElementById("bell-panel");
    if (panel !== null && !panel.hidden && event.target.closest(".bell") === null) {
        panel.hidden = true;
    }
});

// Add the bell when the page has loaded
window.addEventListener("DOMContentLoaded", addBell);
