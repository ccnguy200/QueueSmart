// Location feature: shared by user_location.html and queue_status.html
// Note: Mock data used (approximate spots on the UH campus)

// Each service and the building where its queue is
let places = {
    "Advising": {name: "Student Service Center 1", latitude: 29.7213, longitude: -95.3425},
    "Financial Aid": {name: "Welcome Center", latitude: 29.7236, longitude: -95.3436},
    "Tutoring": {name: "M.D. Anderson Library", latitude: 29.7210, longitude: -95.3416}
};

// The user must be this close (in miles) to join or check in
let allowedMiles = 0.5;

// Find the distance in miles between the user and a place
function getDistance(userLat, userLng, placeLat, placeLng) {
    // 1 degree of latitude is about 69 miles
    let latMiles = (userLat - placeLat) * 69;

    // 1 degree of longitude is about 69 miles times cos(latitude)
    let lngMiles = (userLng - placeLng) * 69 * Math.cos(placeLat * Math.PI / 180);

    // Use the Pythagorean theorem to get the straight line distance
    let miles = Math.sqrt(latMiles * latMiles + lngMiles * lngMiles);

    // Round to 2 decimal places so the number shown and the 0.5 check match
    return Math.round(miles * 100) / 100;
}

// Check the latitude and longitude the user typed in
// Returns an error message, or "" if both are fine
function checkCoordinates(latText, lngText) {
    if (latText === "" || lngText === "") {
        return "Please enter both latitude and longitude.";
    }
    if (isNaN(Number(latText)) || isNaN(Number(lngText))) {
        return "Latitude and longitude must be numbers.";
    }
    if (Number(latText) < -90 || Number(latText) > 90) {
        return "Latitude must be between -90 and 90.";
    }
    if (Number(lngText) < -180 || Number(lngText) > 180) {
        return "Longitude must be between -180 and 180.";
    }
    return "";
}
