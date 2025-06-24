import requests
from bs4 import BeautifulSoup
import time

BASE_URL = "https://letterboxd.com"
START_URL = f"{BASE_URL}/blessedheart/films/"
OUTPUT_FILENAME = "film_list.txt"


def main():
    print("Scraper starting...")

    all_film_titles = []

    current_url = START_URL

    while current_url:
        print(f"Scraping page: {current_url}")

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
        }
        response = requests.get(current_url, headers=headers)

        if response.status_code != 200:
            print(f"Error fetching {current_url}. Status: {response.status_code}. Stopping.")
            break 
        
        soup = BeautifulSoup(response.text, 'html.parser')

        film_posters = soup.find_all('li', class_='poster-container')

        if not film_posters:
            print("Could not find ant film posters on this page. Stopping.")
            break

        for poster in film_posters:
            img_tag = poster.find('img')
            if img_tag:
                film_title = img_tag.get('alt')
                if film_title :
                    all_film_titles.append(film_title)
        
        next_link_tag = soup.find('a', class_='next')
                
        if next_link_tag:
            
            next_page_relative_url = next_link_tag['href']
            
            current_url = BASE_URL + next_page_relative_url
            
            print(f"Found next page: {current_url}")
            print("Waiting 1 second before next request...")
            time.sleep(1)
        else:
            print("No 'Next' page found. Reached the end.")
            current_url = None
            

    print("\n-----------------------------------------")
    print(f"Scraping complete! Found a total of {len(all_film_titles)} films.")
    print("Here are the first 25 results:")
    for title in all_film_titles[:100]: 
        print(f"- {title}")

    try:
        with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
            for title in all_film_titles:
                f.write(f"{title}\n")
        print(f"All film titles have been saved to the file: {OUTPUT_FILENAME}")
    except IOError as e:
        print(f"Error writing to file {OUTPUT_FILENAME}: {e}")

if __name__ == "__main__":
    main()