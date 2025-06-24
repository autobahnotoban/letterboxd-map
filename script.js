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
    console.log(`Starting to load data for user: ${username}`);
    try {
        // --- DYNAMIC FETCH ---
        // Constructs the filename based on the URL parameter (e.g., 'dave.json').
        const response = await fetch(`${username}.json`);
        if (!response.ok) { throw new Error(`Could not find data file for user: ${username}`); }
        const rawFilmData = await response.json();

        // (The aggregation, geocoding, and plotting logic is identical to before)
        const locationData = {};
        // ... (This section is unchanged) ...

        for (const originalBirthplace of Object.keys(locationData)) {
            // ... (This section is unchanged) ...
            if (results && results.length > 0) {
                // ... (This section is unchanged) ...
                const marker = L.circle([location.y, location.x], {
                    radius: getRadiusForZoom(map.getZoom()),
                    // ... styles ...
                });
                marker.bindPopup(popupContent).addTo(map);
                allCircles.push(marker);
            }
        }
        console.log("Map processing complete.");
    } catch (error) {
        console.error("A critical error occurred:", error);
    }
}

// --- 5. EXECUTE THE FUNCTION ---
loadAndPlotData();