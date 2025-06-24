// --- DYNAMICALLY GET USERNAME FROM URL ---
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('user');

if (!username) {
    document.body.innerHTML = `
        <div style="text-align: center; padding-top: 50px; font-family: sans-serif;">
            <h1>Error: No User Specified</h1>
            <p>Please return to the homepage to select a map.</p>
        </div>
    `;
    throw new Error("No user specified in URL. Halting script.");
}

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
        const response = await fetch(`${username}.json`);
        if (!response.ok) { throw new Error(`Could not find data file for user: ${username}`); }
        const rawFilmData = await response.json();

        if (!rawFilmData || rawFilmData.length === 0) {
            console.error("Data file is empty or invalid. Cannot plot dots.");
            return;
        }

        // --- STEP A: AGGREGATE BY DIRECTOR ---
        const aggregatedDirectors = {};
        rawFilmData.forEach(film => {
            if (!film.director_name) return; // Skip records with no director
            const directorName = film.director_name;
            if (!aggregatedDirectors[directorName]) {
                aggregatedDirectors[directorName] = { birthplace: film.birthplace, films: [] };
            }
            aggregatedDirectors[directorName].films.push(film.film_title);
        });

        // --- STEP B: AGGREGATE BY LOCATION ---
        const locationData = {};
        for (const directorName in aggregatedDirectors) {
            const directorInfo = aggregatedDirectors[directorName];
            const birthplace = directorInfo.birthplace;
            if (!birthplace) continue;
            if (!locationData[birthplace]) {
                locationData[birthplace] = { directors: [] };
            }
            locationData[birthplace].directors.push({ name: directorName, films: directorInfo.films });
        }

        // --- STEP C: Geocode and Plot Each UNIQUE LOCATION ---
        console.log(`[DEBUG] Found ${Object.keys(locationData).length} unique locations to plot.`);
        const provider = new GeoSearch.OpenStreetMapProvider();
        for (const originalBirthplace of Object.keys(locationData)) {
            let cleanedBirthplace = originalBirthplace.replace(/\[.*?\]/g, '').replace('West Germany', 'Germany').replace('USSR', '').replace('Ukrainian SSR', '').trim().replace(/,$/, '');
            const results = await provider.search({ query: cleanedBirthplace });

            if (results && results.length > 0) {
                const location = results[0];
                const directorsList = locationData[originalBirthplace].directors;
                let popupContent = `<h3>${originalBirthplace}</h3><hr>`;
                directorsList.forEach(director => {
                    popupContent += `<h4>${director.name}</h4><ul>`;
                    director.films.forEach(film => { popupContent += `<li>${film}</li>`; });
                    popupContent += `</ul>`;
                });

                const initialRadius = getRadiusForZoom(map.getZoom());
                const marker = L.circle([location.y, location.x], {
                    radius: initialRadius,
                    fillColor: "#3388ff",
                    fillOpacity: 0.5,
                    weight: 1,
                    color: "#004C99"
                });
                
                marker.bindPopup(popupContent).addTo(map);
                allCircles.push(marker);
            } else {
                console.warn(`Could not find coordinates for: ${originalBirthplace}`);
            }
        }
        
        console.log("--------------------------------------");
        console.log("Map processing complete. All locations attempted.");
    } catch (error) {
        console.error("A critical error occurred:", error);
    }
}

// --- 5. EXECUTE THE FUNCTION ---
loadAndPlotData();