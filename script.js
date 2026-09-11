let usernames = ["example@gmail.com"]
let passwords = ["password"]

function login() {
    const username = document.getElementById("email").value;
    const password = document.getElementById("secret").value;
    for (let i = 0; i < usernames.length; i++){
        if((username == usernames[i]) && (password == passwords[i])) {
            alert("Login Successful")
            return true;
        }
        else {
            alert("Incorrect Login")
            return false;
        }
    }
}

// function register() {

// }