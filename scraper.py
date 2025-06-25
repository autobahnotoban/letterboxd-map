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
    
    # Simple headers, no cookie needed.
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
            
            # --- THE DIRECT AND CORRECT LOGIC ---
            # Find any tag that has the 'data-film-slug' attribute.
            film_tags = soup.find_all(attrs={"data-film-slug": True})

            if not film_tags:
                print("No film slugs found on this page. Assuming this is the end.")
                break

            print(f"Found {len(film_tags)} film slugs on this page. Parsing...")

            for tag in film_tags:
                slug = tag['data-film-slug']
                
                # Default values
                title = ''
                year = 'N/A'
                
                slug_parts = slug.split('-')
                
                # Check if the last part is a year
                if slug_parts[-1].isdigit() and len(slug_parts[-1]) == 4:
                    year = slug_parts[-1]
                    # The title is everything before the year
                    title_parts = slug_parts[:-1]
                else:
                    # If no year, the whole slug is the title
                    title_parts = slug_parts
                
                # Reconstruct the title and make it look nice
                title = ' '.join(part.capitalize() for part in title_parts)
                
                films_list.append((title, year))
                print(f"  - Found: {title} ({year})")

            # Find the 'Older' button for the next page
            next_page_link = soup.find('a', class_='next')
            if next_page_link and 'href' in next_page_link.attrs:
                current_url = "https://letterboxd.com" + next_page_link['href']
                page_count += 1
            else:
                print("\nNo 'Older' button found. This is the last page.")
                current_url = None # End the loop
            
            time.sleep(1) # Be respectful to the server

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
        # Using a set of tuples automatically removes any duplicate entries
        unique_films = sorted(list(set(all_films_data)), key=lambda x: x[0])
        print(f"\nTotal unique films found: {len(unique_films)}")
        save_to_csv(unique_films, f"{target_username}_watched_films.csv")
    else:
        print("\nScraping did not complete or no films were found.")