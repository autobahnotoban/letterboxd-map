// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Get the username from the URL parameter ---
    const params = new URLSearchParams(window.location.search);
    const username = params.get('user');

    const mapTitleElement = document.getElementById('map-title');
    const mapContainer = document.getElementById('map');

    if (!username) {
        mapTitleElement.textContent = 'Error: No user specified.';
        mapContainer.innerHTML = '<p style="text-align:center;">Please return to the user list and select a map to view.</p>';
        return; // Stop the script
    }

    // --- 2. Update the page title ---
    mapTitleElement.textContent = `${username.charAt(0).toUpperCase() + username.slice(1)}'s Director Map`;
    
    // --- 3. Initialize the Leaflet map ---
    // Set a default view (e.g., centered on Europe)
    const map = L.map('map').setView([50, 10], 2);

    // Add the map tiles (the visual map background)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // --- 4. Fetch the user's specific JSON file ---
    const dataUrl = `${username}.json`;

    fetch(dataUrl)
        .then(response => {
            if (!response.ok) {
                // Handle cases where the JSON file doesn't exist (404 error)
                throw new Error(`Could not find map data for user: ${username}`);
            }
            return response.json();
        })
        .then(locations => {
            if (locations.length === 0) {
                 mapContainer.innerHTML = '<p style="text-align:center;">No director birthplace data was found for this user.</p>';
                 return;
            }

            // --- 5. Add markers to the map ---
            const markers = [];
            locations.forEach(location => {
                const marker = L.marker([location.lat, location.lon])
                    .addTo(map)
                    .bindPopup(location.popup_html);
                markers.push(marker);
            });
            
            // Automatically adjust the map's view to fit all markers
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.2)); // .pad adds a nice margin
        })
        .catch(error => {
            console.error('Error loading map data:', error);
            mapTitleElement.textContent = 'Error Loading Map';
            mapContainer.innerHTML = `<p style="text-align:center; color: #ff6666;">${error.message}. Please check if the file '${dataUrl}' exists in the repository.</p>`;
        });
});