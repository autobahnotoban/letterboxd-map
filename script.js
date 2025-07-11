document.addEventListener('DOMContentLoaded', () => {

    const params = new URLSearchParams(window.location.search);
    const username = params.get('user');

    const mapTitleElement = document.getElementById('map-title');
    const mapContainer = document.getElementById('map');
    const directorListElement = document.getElementById('director-list'); 

    if (!username) {
        mapTitleElement.textContent = 'Error: No user specified.';
        mapContainer.innerHTML = '<p style="text-align:center;">Please return to the user list and select a map to view.</p>';
        return;
    }

    mapTitleElement.textContent = `${username.charAt(0).toUpperCase() + username.slice(1)}'s Director Map`;
    
    const map = L.map('map').setView([50, 10], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    const dataUrl = `${username}.json`;
    const markerReferences = {};

    fetch(dataUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Could not find map data for user: ${username}`);
            }
            return response.json();
        })
        .then(locations => {
            if (locations.length === 0) {
                 mapContainer.innerHTML = '<p style="text-align:center;">No director birthplace data was found for this user.</p>';
                 return;
            }

            const allDirectors = [];
            

            locations.forEach(location => {
                const marker = L.marker([location.lat, location.lon])
                    .addTo(map)
                    .bindPopup(location.popup_html);
                for (const directorName in location.directors) {
                    allDirectors.push(directorName);
                    markerReferences[directorName] = marker; 
                }
            });
            allDirectors.sort();
            allDirectors.forEach(directorName => {
                const li = document.createElement('li');
                li.textContent = directorName;
                li.dataset.director = directorName; 
                directorListElement.appendChild(li);
            });
            
            const allMarkers = Object.values(markerReferences);
            const group = new L.featureGroup(allMarkers);
            map.fitBounds(group.getBounds().pad(0.2)); 
        })
        .catch(error => {
            console.error('Error loading map data:', error);
            mapTitleElement.textContent = 'Error Loading Map';
            mapContainer.innerHTML = `<p style="text-align:center; color: #ff6666;">${error.message}. Please check if the file '${dataUrl}' exists in the repository.</p>`;
        });

    directorListElement.addEventListener('click', (event) => {
        if (event.target && event.target.nodeName === 'LI') {
            const directorName = event.target.dataset.director;
            const targetMarker = markerReferences[directorName];

            if (targetMarker) {
                map.flyTo(targetMarker.getLatLng(), 13);
                targetMarker.openPopup();
            }
        }
    });
});