// --- Get Username and Set Up Page ---
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('user');

if (!username) {
    document.body.innerHTML = `<div style="text-align: center; padding: 50px; font-family: sans-serif;"><h1>Error: No User Specified</h1><p>Please return to the homepage and select a map.</p></div>`;
    throw new Error("No user specified in URL. Halting script.");
}

document.title = `${username}'s Director Map`;
document.getElementById('title-overlay').textContent = `Map of ${username}'s Director Birthplaces`;

// --- Initialize Map ---
const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// --- Main Data Processing Function ---
async function loadAndPlotData() {
    try {
        const response = await fetch(`${username}.json`);
        if (!response.ok) { throw new Error(`Could not find data file: ${username}.json`); }
        const rawFilmData = await response.json();

        if (!rawFilmData || rawFilmData.length === 0) {
            console.error("Data file is empty. Cannot plot dots.");
            return;
        }

        // --- STEP A: AGGREGATE BY DIRECTOR (including films) ---
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
        const locationData = {};
        for (const directorName in aggregatedDirectors) {
            const directorInfo = aggregatedDirectors[directorName];
            const birthplace = directorInfo.birthplace;
            if (!locationData[birthplace]) {
                locationData[birthplace] = { directors: [] };
            }
            // Add the director's name AND their list of films
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
                
                // --- RE-IMPLEMENTED POPUP WITH FILMS ---
                let popupContent = `<h3>${originalBirthplace}</h3><hr>`;
                directorsList.forEach(director => {
                    popupContent += `<h4>${director.name}</h4><ul>`;
                    // Sort films alphabetically for a clean list
                    director.films.sort().forEach(film => {
                        popupContent += `<li>${film}</li>`;
                    });
                    popupContent += `</ul>`;
                });

                L.circleMarker([location.y, location.x], {
                    radius: 8,
                    fillColor: "#3388ff",
                    color: "#005a7e", // A darker border for the light blue fill
                    weight: 1,
                    fillOpacity: 0.7
                }).addTo(map)
                  .bindPopup(popupContent);
                
                plottedCount++;
            }
        }
        console.log(`Plotting complete. Successfully plotted ${plottedCount} unique locations.`);
    } catch (error) {
        console.error("A critical error occurred:", error);
    }
}

// --- Execute the Function ---
loadAndPlotData();