// --- Get Username from URL ---
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('user');

if (!username) {
    document.body.innerHTML = `<div style="text-align: center; padding: 50px; font-family: sans-serif;"><h1>Error: No User Specified</h1><p>Please return to the homepage and select a map.</p></div>`;
    throw new Error("No user specified in URL. Halting script.");
}
document.title = `${username}'s Director Map`;

// --- Initialize Map ---
const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// --- Dynamic Resizing Logic ---
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

// --- Main Data Processing Function ---
async function loadAndPlotData() {
    console.log(`Attempting to load data for user: '${username}'...`);
    try {
        const response = await fetch(`${username}.json`);
        if (!response.ok) { throw new Error(`Could not find data file: ${username}.json`); }
        const rawFilmData = await response.json();

        if (!rawFilmData || rawFilmData.length === 0) {
            console.error("Data file is empty. Cannot plot dots.");
            return;
        }

        // --- STEP A: AGGREGATE BY DIRECTOR ---
        // This creates a list of unique directors and all their films.
        const aggregatedDirectors = {};
        rawFilmData.forEach(film => {
            if (!film || !film.director_name || !film.birthplace) return;
            const directorName = film.director_name;
            if (!aggregatedDirectors[directorName]) {
                aggregatedDirectors[directorName] = { birthplace: film.birthplace, films: [] };
            }
            aggregatedDirectors[directorName].films.push(film.film_title);
        });

        // --- STEP B: AGGREGATE BY LOCATION ---
        // This groups the directors by their shared birthplace.
        const locationData = {};
        for (const directorName in aggregatedDirectors) {
            const directorInfo = aggregatedDirectors[directorName];
            const birthplace = directorInfo.birthplace;
            if (!locationData[birthplace]) {
                locationData[birthplace] = { directors: [] };
            }
            // Add the full director object (name and films) to the location.
            locationData[birthplace].directors.push({
                name: directorName,
                films: directorInfo.films
            });
        }
        
        // --- STEP C: Geocode and Plot Each UNIQUE LOCATION ---
        const provider = new GeoSearch.OpenStreetMapProvider();
        let plottedCount = 0;
        for (const originalBirthplace of Object.keys(locationData)) {
            let cleanedBirthplace = originalBirthplace.replace(/\[.*?\]/g, '').replace('West Germany', 'Germany').replace('USSR', '').replace('Ukrainian SSR', '').trim().replace(/,$/, '');
            if (!cleanedBirthplace) continue;

            const results = await provider.search({ query: cleanedBirthplace });

            if (results && results.length > 0) {
                const location = results[0];
                const directorsList = locationData[originalBirthplace].directors;
                
                // --- THIS IS THE KEY CHANGE: Building the detailed popup ---
                let popupContent = `<h3>${originalBirthplace}</h3><hr>`;
                directorsList.forEach(director => {
                    popupContent += `<h4>${director.name}</h4><ul>`;
                    // Sort films alphabetically for a clean list
                    director.films.sort().forEach(film => {
                        popupContent += `<li>${film}</li>`;
                    });
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
                
                marker.bindPopup(popupContent);
                marker.addTo(map);
                allCircles.push(marker);
                plottedCount++;
            }
        }
        console.log(`Process complete. Successfully plotted ${plottedCount} unique locations.`);
    } catch (error) {
        console.error("A critical error occurred:", error);
    }
}

// --- Execute the Function ---
loadAndPlotData();