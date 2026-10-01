let users = 
{
    "admin@email.com": {password: "password", role: "admin"},
    "user@email.com": {password: "password", role: "user"}
};

function login() {
    let username = document.getElementById("email").value.toLowerCase();
    let password = document.getElementById("secret").value;
    if(users[username] && (users[username].password === password)) {
        // Go to the right dashboard after the user clicks OK
        if(users[username].role == "admin"){
            showPopup("Login Successful", goToAdminDashboard);
        }
        else{
            showPopup("Login Successful", goToUserDashboard);
        }
        return false;
    }
    showPopup("Incorrect Login");
    return false;
}

function register() {
    let first = document.getElementById("first").value.toLowerCase();
    let second = document.getElementById("second").value;
    let role = document.getElementById("role").value;

    if(first in users){
        showPopup("That email is already registered with an account!")
        return false;
    }

    if(role == "admin"){
        let cardNumber = document.getElementById("cardNumber").value.trim();
        let cardExpiry = document.getElementById("cardExpiry").value.trim();
        let cardCVV = document.getElementById("cardCVV").value.trim();

        if(!cardNumber || !cardExpiry || !cardCVV){
            showPopup("Admins must provide credit card information!");
            return false;
        }

        // Card number must be 16 digits
        if(cardNumber.length != 16 || !isAllDigits(cardNumber)){
            showPopup("Card Number must be 16 digits (numbers only)!");
            return false;
        }

        // Expiry must look like MM/YY
        let month = cardExpiry.substring(0, 2);
        let year = cardExpiry.substring(3, 5);
        if(cardExpiry.length != 5 || cardExpiry[2] != "/" || !isAllDigits(month) || !isAllDigits(year)){
            showPopup("Expiry must be in MM/YY format!");
            return false;
        }

        // Month must be between 01 and 12
        if(Number(month) < 1 || Number(month) > 12){
            showPopup("Expiry month must be between 01 and 12!");
            return false;
        }

        // Card cannot be expired
        let now = new Date();
        let thisMonth = now.getMonth() + 1;
        let thisYear = now.getFullYear() - 2000;
        if(Number(year) < thisYear || (Number(year) == thisYear && Number(month) < thisMonth)){
            showPopup("This card has expired!");
            return false;
        }

        // CVV must be 3 digits
        if(cardCVV.length != 3 || !isAllDigits(cardCVV)){
            showPopup("CVV must be 3 digits!");
            return false;
        }
    }

    users[first] = {password: second, role: role};
    
    // Go to the right dashboard after the user clicks OK
    if(users[first].role == "admin"){
        showPopup("Register Successful", goToAdminDashboard);
    }
    else{
        showPopup("Register Successful", goToUserDashboard);
    }
    return false;
}

function goToAdminDashboard() {
    window.location.href = "admin_dashboard.html";
}

function goToUserDashboard() {
    window.location.href = "user_dashboard.html";
}

// Returns true if the text only has the numbers 0-9
function isAllDigits(text) {
    for(let i = 0; i < text.length; i++){
        if(text[i] < "0" || text[i] > "9"){
            return false;
        }
    }
    return true;
}

function adminRegister() {
    let role = document.getElementById("role").value;

    if(role === "admin"){
        document.getElementById("adminReg").style.display = "block";
    }
    else {
        document.getElementById("adminReg").style.display = "none";
    }
}

function resetData() {
    localStorage.removeItem("users");
    showPopup("Data reset. Default accounts restored on next load.", reloadPage);
}

function reloadPage() {
    location.reload();
}


