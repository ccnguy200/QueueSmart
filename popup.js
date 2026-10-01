// Pop-up messages that match the QueueSmart style
// Used instead of the browser's alert() and confirm() boxes

// Show a message with an OK button
// afterOk (optional): a function to run after the user clicks OK
function showPopup(message, afterOk) {
    // Dark background that covers the whole page
    let overlay = document.createElement("div");
    overlay.className = "popup-overlay";

    // White box in the middle of the screen
    let box = document.createElement("div");
    box.className = "popup-box";

    // The message
    let text = document.createElement("p");
    text.innerText = message;
    box.appendChild(text);

    // OK button closes the pop-up
    let buttons = document.createElement("div");
    buttons.className = "popup-buttons";

    let okButton = document.createElement("button");
    okButton.className = "btn";
    okButton.innerText = "OK";
    okButton.onclick = function () {
        document.body.removeChild(overlay);
        if (afterOk) {
            afterOk();
        }
    };
    buttons.appendChild(okButton);
    box.appendChild(buttons);

    // Keep the keyboard inside the pop-up, and Escape works like OK
    overlay.onkeydown = function (event) {
        if (event.key === "Tab") {
            event.preventDefault();
        }
        if (event.key === "Escape") {
            okButton.click();
        }
    };

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Pressing Enter clicks OK
    okButton.focus();
}

// Ask a yes or no question
// ifYes: a function to run only when the user clicks Yes
function showConfirm(message, ifYes) {
    // Dark background that covers the whole page
    let overlay = document.createElement("div");
    overlay.className = "popup-overlay";

    // White box in the middle of the screen
    let box = document.createElement("div");
    box.className = "popup-box";

    // The question
    let text = document.createElement("p");
    text.innerText = message;
    box.appendChild(text);

    let buttons = document.createElement("div");
    buttons.className = "popup-buttons";

    // No: just close the pop-up
    let noButton = document.createElement("button");
    noButton.className = "btn-secondary";
    noButton.innerText = "No";
    noButton.onclick = function () {
        document.body.removeChild(overlay);
    };
    buttons.appendChild(noButton);

    // Yes: close the pop-up and do the action
    let yesButton = document.createElement("button");
    yesButton.className = "btn";
    yesButton.innerText = "Yes";
    yesButton.onclick = function () {
        document.body.removeChild(overlay);
        ifYes();
    };
    buttons.appendChild(yesButton);
    box.appendChild(buttons);

    // Keep the keyboard inside the pop-up, and Escape works like No
    overlay.onkeydown = function (event) {
        if (event.key === "Tab") {
            // Tab only moves between No and Yes
            event.preventDefault();
            if (document.activeElement === noButton) {
                yesButton.focus();
            } else {
                noButton.focus();
            }
        }
        if (event.key === "Escape") {
            noButton.click();
        }
    };

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Pressing Enter clicks No, so nothing happens by accident
    noButton.focus();
}
