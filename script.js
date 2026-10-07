const API = "http://localhost:3000/api/auth";

async function login() {
    let username = document.getElementById("email").value.toLowerCase().trim();
    let password = document.getElementById("secret").value;
    
    //  Use JSON + server.js
    try {
        const input = await fetch(`${API}/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email: username, password: password})
        });
        const data = await input.json();

        if (!input.ok) {
            showPopup("Incorrect Login.");
            return false;
        }
        if (data.role == "admin") {
            showPopup("Login Successful", goToAdminDashboard);
        }
        else{
            showPopup("Login Successful", goToUserDashboard);
        }
    }
    catch {
        showPopup("Server Error");
    }
    return false;
}

async function register() {
    let first = document.getElementById("first").value.toLowerCase().trim();
    let second = document.getElementById("second").value;
    let role = document.getElementById("role").value;

    const user = {first: first, second: second, role: role};

    if(role == "admin"){
        user.cardNumber = document.getElementById("cardNumber").value.trim();
        user.cardExpiry = document.getElementById("cardExpiry").value.trim();
        user.cardCVV = document.getElementById("cardCVV").value.trim();
    }

    try {
        const input = await fetch(`${API}/register`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(user)
        });
        
        const data = await input.json();

        if (!input.ok) {
            showPopup(data.error || "Registration failed.");
            return false;
        }
        if (data.role == "admin") {
            showPopup("Register Successful", goToAdminDashboard);
        }
        else{
            showPopup("Register Successful", goToUserDashboard);
        }
    }
    catch {
        showPopup("Server Error");
    }
    return false;
}

function goToAdminDashboard() {
    window.location.href = "admin_dashboard.html";
}

function goToUserDashboard() {
    window.location.href = "user_dashboard.html";
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
    showPopup("Data reset. Default accounts restored on next load.", reloadPage);
}

function reloadPage() {
    location.reload();
}