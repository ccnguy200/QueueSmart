let users = JSON.parse(localStorage.getItem("users")) || 
{
    "admin@email.com": {password: "password", role: "admin"},
    "user@email.com": {password: "password", role: "user"}
};

function login() {
    let username = document.getElementById("email").value;
    let password = document.getElementById("secret").value;
    if(users[username] && (users[username].password === password)) {
        alert("Login Successful");
        if(users[username].role == "admin"){
            window.location.href = "admin_dashboard.html";
        }
        else{
            window.location.href = "user_dashboard.html";
        }
        return false;
    }
    alert("Incorrect Login");
    return false;
}

function register() {
    let first = document.getElementById("first").value;
    let second = document.getElementById("second").value;
    let role = document.getElementById("role").value;

    if(first in users){
        alert("That email is already registered with an account!")
        return false;
    }

    if(role == "admin"){
        let cardNumber = document.getElementById("cardNumber").value;
        let cardExpiry = document.getElementById("cardExpiry").value;
        let cardCVV = document.getElementById("cardCVV").value;

        if(!cardNumber || !cardExpiry || !cardCVV){
            alert("Admins must provide credit card information!");
            return false;
        }
    }

    users[first] = {password: second, role: role};
    localStorage.setItem("users", JSON.stringify(users));
    alert("Register Successful")
    return false;
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
    alert("Data reset. Default accounts restored on next load.");
    location.reload();
}