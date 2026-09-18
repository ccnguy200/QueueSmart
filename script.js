let users = JSON.parse(localStorage.getItem("users")) || {"example@gmail.com": "password"};

function login() {
    let username = document.getElementById("email").value;
    let password = document.getElementById("secret").value;
    if((users[username] == password)) {
        alert("Login Successful");
        return true;
    }
    else {
        alert("Incorrect Login");
        return false;
    }
}

function register() {
    let first = document.getElementById("first").value;
    let second = document.getElementById("second").value;

    if(first in users){
        alert("That email is already registered with an account!")
        return false;
    }
    else {
        alert("Register Successful")
        users[first] = second;
        localStorage.setItem("users", JSON.stringify(users));
        return true;
    }
}