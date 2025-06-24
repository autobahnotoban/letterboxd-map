
import requests
import json
import time
from config import API_KEY


TMDB_API_BASE_URL = "https://api.themoviedb.org/3"
INPUT_FILENAME = "film_list.txt"
OUTPUT_FILENAME = "enriched_data.json"

DELAY_BETWEEN_REQUESTS = 0.5 

def get_film_data(film_title, api_key):
    """
    Takes a film title and returns a dictionary with director info, or None.
    This function contains the 3-step API call chain for one film.
    """

    search_url = f"{TMDB_API_BASE_URL}/search/movie"
    params = {'api_key': api_key, 'query': film_title}
    response = requests.get(search_url, params=params)
    if response.status_code != 200:
        return None 
    
    results = response.json().get('results')
    if not results:
        return None 
    
    movie_id = results[0].get('id')
    if not movie_id:
        return None


    credits_url = f"{TMDB_API_BASE_URL}/movie/{movie_id}/credits"
    params = {'api_key': api_key}
    response = requests.get(credits_url, params=params)
    if response.status_code != 200:
        return None

    crew = response.json().get('crew', [])
    director_name, director_id = None, None
    for member in crew:
        if member.get('job') == 'Director':
            director_name = member.get('name')
            director_id = member.get('id')
            break
    
    if not director_id:
        return None
        

    person_url = f"{TMDB_API_BASE_URL}/person/{director_id}"
    params = {'api_key': api_key}
    response = requests.get(person_url, params=params)
    if response.status_code != 200:
        return None

    birthplace = response.json().get('place_of_birth')
    if not birthplace:
        return None 
    

    return {
        "film_title": film_title,
        "director_name": director_name,
        "birthplace": birthplace
    }

def main():
    """
    Main function to loop through all films and save enriched data.
    """
    print("Enricher script starting...")
    
    try:
        with open(INPUT_FILENAME, 'r', encoding='utf-8') as f:
            film_titles = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"Error: {INPUT_FILENAME} not found. Run scraper.py first.")
        return
        
    total_films = len(film_titles)
    print(f"Found {total_films} film titles to process.")
    
    final_data = []
    

    for i, title in enumerate(film_titles):
        print(f"Processing ({i+1}/{total_films}): {title}...")
        

        data = get_film_data(title, API_KEY)
        
        if data:
            print(f"  -> SUCCESS: Found data for director {data['director_name']}.")
            final_data.append(data)
        else:
            print(f"  -> FAILED: Could not find complete data for this film.")
        

        time.sleep(DELAY_BETWEEN_REQUESTS)

    print("\n-----------------------------------------")
    print(f"Processing complete.")
    print(f"Successfully enriched {len(final_data)} out of {total_films} films.")


    with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:


        json.dump(final_data, f, indent=2, ensure_ascii=False)

    print(f"All data saved to {OUTPUT_FILENAME}")

if __name__ == "__main__":
    main()