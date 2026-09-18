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
            alert("Incorrect Login");
            return false;
        }
    }
}

function register() {
    let first = document.getElementById("first").value;
    let second = document.getElementById("second").value;

    if(usernames.contains(first)){
        alert("That email is already registered with an account!")
        return false;
    }
    else {
        usernames.push(first);
        passwords.push(second);
        return true;
    }
}