import csv
import requests
import time
import json
from geopy.geocoders import Nominatim
from pathlib import Path

try:
    from config import API_KEY
except ImportError:
    print("FATAL: config.py not found or TMDB_API_KEY not set within it.")
    exit()

INPUT_CSV_USERNAME = "avapersona"
TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie"
TMDB_DETAILS_URL = "https://api.themoviedb.org/3/movie/"
TMDB_PERSON_URL = "https://api.themoviedb.org/3/person/"

def search_movie_id(title, year):
    params = {'api_key': API_KEY, 'query': title}
    if year and year != 'N/A':
        params['year'] = year
    try:
        response = requests.get(TMDB_SEARCH_URL, params=params)
        response.raise_for_status()
        results = response.json().get('results', [])
        if results:
            return results[0]['id']
    except requests.RequestException as e:
        print(f"  - API Error searching for '{title}': {e}")
    return None

def get_director_details(movie_id):
    credits_url = f"{TMDB_DETAILS_URL}{movie_id}/credits"
    params = {'api_key': API_KEY}
    try:
        response = requests.get(credits_url, params=params)
        response.raise_for_status()
        crew = response.json().get('crew', [])
        for member in crew:
            if member.get('job') == 'Director':
                person_id = member.get('id')
                if person_id:
                    person_response = requests.get(f"{TMDB_PERSON_URL}{person_id}", params=params)
                    person_data = person_response.json()
                    return person_data.get('name'), person_data.get('place_of_birth')
    except requests.RequestException as e:
        print(f"  - API Error getting director for movie ID {movie_id}: {e}")
    return None, None

def geocode_location(location_name, geolocator, cache):
    if not location_name: return None, None, None
    if location_name in cache: return cache[location_name]
    try:
        time.sleep(1)
        location = geolocator.geocode(location_name)
        if location:
            result = (location.latitude, location.longitude, location.address)
            cache[location_name] = result
            return result
    except Exception as e:
        print(f"  - Geocoding error for '{location_name}': {e}")
    cache[location_name] = (None, None, None)
    return None, None, None

if __name__ == "__main__":
    input_file = Path(f"{INPUT_CSV_USERNAME}_watched_films.csv")
    if not input_file.exists():
        print(f"FATAL: Input file not found: {input_file}")
        exit()

    aggregated_locations = {}
    geocode_cache = {}
    geolocator = Nominatim(user_agent="film_director_mapper_v4")

    print(f"Reading films from {input_file}...")
    
    with open(input_file, mode='r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        for row in reader:
            title, year = row['Title'], row['Year']
            print(f"\nProcessing: {title} ({year})")
            movie_id = search_movie_id(title, year)
            time.sleep(0.3)
            if not movie_id: continue
            director_name, birthplace = get_director_details(movie_id)
            time.sleep(0.3)
            if not director_name or not birthplace: continue
            lat, lon, full_address = geocode_location(birthplace, geolocator, geocode_cache)
            if not lat: continue
            print(f"  - Found: {director_name} from {full_address}")
            if full_address not in aggregated_locations:
                aggregated_locations[full_address] = {"lat": lat, "lon": lon, "directors": {}}
            if director_name not in aggregated_locations[full_address]["directors"]:
                aggregated_locations[full_address]["directors"][director_name] = []
            aggregated_locations[full_address]["directors"][director_name].append(title)
    final_json_data = []
    for place, data in aggregated_locations.items():
        popup_html = f"<b>{place}</b><hr><ul>"
        for director, films in data["directors"].items():
            film_list_str = ', '.join(films)
            popup_html += f"<li><b>{director}:</b> <i>{film_list_str}</i></li>"
        popup_html += "</ul>"
        
        final_json_data.append({
            "place_name": place,
            "lat": data["lat"],
            "lon": data["lon"],
            "popup_html": popup_html,
            "directors": data["directors"] 
        })
        
    output_json_filename = f"{INPUT_CSV_USERNAME}.json"
    print(f"\nEnrichment complete. Writing data to {output_json_filename}...")
    
    with open(output_json_filename, 'w', encoding='utf-8') as f:
        json.dump(final_json_data, f, indent=4, ensure_ascii=False)

    print(f"\n--- DONE ---")
    print(f"Successfully created {output_json_filename} with {len(final_json_data)} unique locations.")