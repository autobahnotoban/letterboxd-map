
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('user');
const statusOverlay = document.getElementById('status-overlay');

if (!username) {
    document.body.innerHTML = `<div style="text-align: center; padding: 50px; font-family: sans-serif;"><h1>Error: No User Specified</h1><p>Please return to the homepage.</p></div>`;
    throw new Error("No user specified in URL. Halting script.");
}
document.title = `${username}'s Director Map`;
document.getElementById('title-overlay').textContent = `Map of ${username}'s Director Birthplaces`;


const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


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
    allCircles.forEach(circle => {
        circle.setRadius(newRadius);
    });
});


async function loadAndPlotData() {
    statusOverlay.textContent = `Loading data for ${username}...`;
    try {
        const response = await fetch(`${username}.json`);
        if (!response.ok) { throw new Error(`Could not find data file: ${username}.json`); }
        const rawFilmData = await response.json();

        if (!rawFilmData || rawFilmData.length === 0) { throw new Error("Data file is empty."); }


        const aggregatedDirectors = {};
        rawFilmData.forEach(film => {
            if (!film || !film.director_name || !film.birthplace) return;
            const directorName = film.director_name;
            if (!aggregatedDirectors[directorName]) {
                aggregatedDirectors[directorName] = { birthplace: film.birthplace, films: [] };
            }
            aggregatedDirectors[directorName].films.push(film.film_title);
        });


        const locationData = {};
        for (const directorName in aggregatedDirectors) {
            const directorInfo = aggregatedDirectors[directorName];
            const birthplace = directorInfo.birthplace;
            if (!locationData[birthplace]) {
                locationData[birthplace] = { directors: [] };
            }
            locationData[birthplace].directors.push({ name: directorName, films: directorInfo.films });
        }

        const totalLocations = Object.keys(locationData).length;
        let processedCount = 0;
        let plottedCount = 0;
        const provider = new GeoSearch.OpenStreetMapProvider();

        for (const originalBirthplace of Object.keys(locationData)) {
            processedCount++;
            let cleanedBirthplace = originalBirthplace.replace(/\[.*?\]/g, '').replace('West Germany', 'Germany').replace('USSR', '').replace('Ukrainian SSR', '').trim().replace(/,$/, '');
            if (!cleanedBirthplace) continue;

            const results = await provider.search({ query: cleanedBirthplace });

            if (results && results.length > 0) {

                statusOverlay.textContent = `Added: ${originalBirthplace} (${processedCount}/${totalLocations})`;
                
                const location = results[0];
                const directorsList = locationData[originalBirthplace].directors;
                let popupContent = `<h3>${originalBirthplace}</h3><hr>`;
                directorsList.forEach(director => {
                    popupContent += `<h4>${director.name}</h4><ul>`;
                    director.films.sort().forEach(film => {
                        popupContent += `<li>${film}</li>`;
                    });
                    popupContent += `</ul>`;
                });

                const initialRadius = getRadiusForZoom(map.getZoom());
                const marker = L.circle([location.y, location.x], {
                    radius: initialRadius, fillColor: "#3388ff", fillOpacity: 0.5, weight: 1, color: "#004C99"
                });
                
                marker.bindPopup(popupContent).addTo(map);
                allCircles.push(marker);
                plottedCount++;
            } else {
                statusOverlay.textContent = `Skipping: ${originalBirthplace} (${processedCount}/${totalLocations})`;
            }
        }
        

        statusOverlay.textContent = `Complete! Plotted ${plottedCount} of ${totalLocations} locations.`;
        statusOverlay.classList.add('complete');

    } catch (error) {
        console.error("A critical error occurred:", error);

        statusOverlay.textContent = `Error: ${error.message}`;
        statusOverlay.classList.add('error');
    }
}


loadAndPlotData();