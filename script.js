// --- DYNAMICALLY GET USERNAME FROM URL ---
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('user');

// If no user is specified in the URL, display an error and stop the script.
if (!username) {
    document.body.innerHTML = `
        <div style="text-align: center; padding-top: 50px; font-family: sans-serif;">
            <h1>Error: No User Specified</h1>
            <p>Please return to the homepage to select a map.</p>
        </div>
    `;
    throw new Error("No user specified in URL. Halting script.");
}

// --- DEBUG STEP 1: Confirm the username and filename we are trying to load ---
const dataFileName = `${username}.json`;
console.log(`[DEBUG] Attempting to load data for user: '${username}' from file: '${dataFileName}'`);

// Update the page title and heading dynamically.
document.title = `${username}'s Director Map`;
document.querySelector('h1').textContent = `Map of ${username}'s Director Birthplaces`;

// --- 1. INITIALIZE THE MAP ---
const map = L.map('map').setView([20, 0], 2);

// --- 2. ADD THE TILE LAYER ---
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// --- 3. DYNAMIC RESIZING LOGIC ---
const allCircles = [];
function getRadiusForZoom(zoomLevel) {
    if (zoomLevel <= 4) return 150000;
    if (zoomLevel <= 6) return 50000;
    if (zoomLevel <= 9) return 10000;
    return 1500;
}
map.on('zoomend', function() {
    const currentZoom = map.getZoom();
    const newRadius = getRadiusForZoom(currentZoom);
    allCircles.forEach(circle => { circle.setRadius(newRadius); });
});

// --- 4. THE MAIN DATA PROCESSING FUNCTION ---
async function loadAndPlotData() {
    try {
        const response = await fetch(dataFileName);

        // --- DEBUG STEP 2: Check if the file was found (HTTP status) ---
        console.log(`[DEBUG] Fetch response status: ${response.status}`);
        if (!response.ok) {
            throw new Error(`Could not find data file '${dataFileName}'. Make sure the file exists and the name is spelled correctly.`);
        }
        
        const rawFilmData = await response.json();
        
        // --- DEBUG STEP 3: Check if the JSON data is valid and not empty ---
        console.log(`[DEBUG] Successfully parsed JSON. Found ${rawFilmData.length} records.`);
        if (rawFilmData.length === 0) {
            console.error("[CRITICAL] The JSON file is empty. No dots can be plotted.");
            return; // Stop here if the file is empty
        }

        // (The rest of the logic is unchanged)
        const locationData = {};
        // ... (Aggregation logic) ...
        for (const originalBirthplace of Object.keys(locationData)) {
            // ... (Geocoding and plotting logic) ...
        }
        
        console.log("--------------------------------------");
        console.log("Map processing complete.");

    } catch (error) {
        console.error("A critical error occurred, which is why the map is empty:", error);
    }
}

// --- 5. EXECUTE THE FUNCTION ---
loadAndPlotData();