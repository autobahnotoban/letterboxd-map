// --- SCRIPT START ---
console.log("1. script.js has started.");

// --- INITIALIZE THE MAP ---
const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
console.log("2. Map and tile layer have been initialized.");


// --- MAIN FUNCTION TO LOAD AND PLOT DATA ---
async function loadAndPlotData() {
    try {
        console.log("3. Starting loadAndPlotData function...");
        
        // --- FETCH THE DATA ---
        const response = await fetch('blessedheart.json');
        console.log("4. Fetch command sent. Response status:", response.status);
        if (!response.ok) {
            throw new Error(`Failed to fetch blessedheart.json. Status: ${response.status}`);
        }
        const rawFilmData = await response.json();
        console.log(`5. Successfully parsed JSON. Found ${rawFilmData.length} records.`);

        // --- AGGREGATE THE DATA ---
        const locationData = {};
        rawFilmData.forEach(film => {
            if (!film || !film.director_name || !film.birthplace) {
                return; // Skip invalid records
            }
            const birthplace = film.birthplace;
            if (!locationData[birthplace]) {
                locationData[birthplace] = { directors: [] };
            }
            locationData[birthplace].directors.push(film.director_name);
        });
        console.log(`6. Aggregated data into ${Object.keys(locationData).length} unique locations.`);
        
        // --- PLOT THE DATA ---
        const provider = new GeoSearch.OpenStreetMapProvider();
        let plottedCount = 0;
        
        for (const originalBirthplace of Object.keys(locationData)) {
            let cleanedBirthplace = originalBirthplace.replace(/\[.*?\]/g, '').trim();
            if (!cleanedBirthplace) continue;

            const results = await provider.search({ query: cleanedBirthplace });

            if (results && results.length > 0) {
                const location = results[0];
                L.circleMarker([location.y, location.x], {
                    radius: 8,
                    color: "#3388ff"
                }).addTo(map)
                  .bindPopup(`<b>${originalBirthplace}</b><br>${locationData[originalBirthplace].directors.join('<br>')}`);
                
                plottedCount++;
            }
        }
        console.log(`7. Plotting loop finished. Successfully plotted ${plottedCount} dots.`);

    } catch (error) {
        console.error("CRITICAL ERROR:", error);
    }
}

// --- EXECUTE ---
loadAndPlotData();