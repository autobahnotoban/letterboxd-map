import requests
from bs4 import BeautifulSoup
import time
import csv

def scrape_letterboxd_watched(username):
    """
    Scrapes all watched films by directly targeting the 'data-film-slug'
    attribute, which is present in the no-cookie HTML. This is the definitive,
    simple, and correct method.
    """
    
    headers = {
        'User-Agent': 'My-Web-Scraper-App/1.0 (contact: yourname@example.com)'
    }

    current_url = f"https://letterboxd.com/{username}/films/"
    films_list = []
    page_count = 1
    
    print("--- Starting Direct Scrape (No Cookie) ---")

    while current_url:
        print(f"\nRequesting Page {page_count}: {current_url}")
        
        try:
            response = requests.get(current_url, headers=headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')

            film_tags = soup.find_all(attrs={"data-film-slug": True})

            if not film_tags:
                print("No film slugs found on this page. Assuming this is the end.")
                break

            print(f"Found {len(film_tags)} film slugs on this page. Parsing...")

            for tag in film_tags:
                slug = tag['data-film-slug']
                title = ''
                year = 'N/A'
                
                slug_parts = slug.split('-')
                
                if slug_parts[-1].isdigit() and len(slug_parts[-1]) == 4:
                    year = slug_parts[-1]
                    title_parts = slug_parts[:-1]
                else:
                    title_parts = slug_parts
                title = ' '.join(part.capitalize() for part in title_parts)
                
                films_list.append((title, year))
                print(f"  - Found: {title} ({year})")

            next_page_link = soup.find('a', class_='next')
            if next_page_link and 'href' in next_page_link.attrs:
                current_url = "https://letterboxd.com" + next_page_link['href']
                page_count += 1
            else:
                print("\nNo 'Older' button found. This is the last page.")
                current_url = None 
            
            time.sleep(1) 

        except requests.exceptions.RequestException as e:
            print(f"An error occurred: {e}")
            break
            
    return films_list

def save_to_csv(films_data, filename="watched_films.csv"):
    if not films_data:
        print("No film data was scraped to save.")
        return
        
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Title', 'Year'])
        writer.writerows(films_data)
    print(f"\n--- SCRAPE COMPLETE ---")
    print(f"Successfully saved {len(films_data)} films to {filename}")


if __name__ == "__main__":
    target_username = "avapersona"
    
    all_films_data = scrape_letterboxd_watched(target_username)
    
    if all_films_data:
        unique_films = sorted(list(set(all_films_data)), key=lambda x: x[0])
        print(f"\nTotal unique films found: {len(unique_films)}")
        save_to_csv(unique_films, f"{target_username}_watched_films.csv")
    else:
        print("\nScraping did not complete or no films were found.")