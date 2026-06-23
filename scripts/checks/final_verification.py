#!/usr/bin/env python3
import os
import requests

# Supabase PostgreSQL connection details
supabase_url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1"
supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json"
}

# Get count for each type separately using exact count
print("Getting exact counts by type...\n")

# Count films
response = requests.head(
    f"{supabase_url}/opere",
    headers={**headers, "Prefer": "count=exact"},
    params={"tipo": "eq.film"}
)

if response.status_code in [200, 206]:
    count_header = response.headers.get('content-range', '')
    if count_header:
        film_count = count_header.split('/')[-1]
        print(f"Films: {film_count}")

# Count series
response = requests.head(
    f"{supabase_url}/opere",
    headers={**headers, "Prefer": "count=exact"},
    params={"tipo": "eq.serie_tv"}
)

if response.status_code in [200, 206]:
    count_header = response.headers.get('content-range', '')
    if count_header:
        series_count = count_header.split('/')[-1]
        print(f"Serie TV: {series_count}")

# Get total count
response = requests.head(
    f"{supabase_url}/opere",
    headers={**headers, "Prefer": "count=exact"}
)

if response.status_code in [200, 206]:
    count_header = response.headers.get('content-range', '')
    if count_header:
        total_count = count_header.split('/')[-1]
        print(f"Total: {total_count}")

# Sample of each type
print("\nSample films:")
response = requests.get(
    f"{supabase_url}/opere",
    headers=headers,
    params={"tipo": "eq.film", "select": "codice_opera,titolo,anno_produzione", "limit": 10}
)

if response.status_code == 200:
    films = response.json()
    for film in films:
        print(f"  {film.get('codice_opera')}: {film.get('titolo')} ({film.get('anno_produzione')})")

print("\nSample series:")
response = requests.get(
    f"{supabase_url}/opere",
    headers=headers,
    params={"tipo": "eq.serie_tv", "select": "codice_opera,titolo,anno_produzione", "limit": 10}
)

if response.status_code == 200:
    series = response.json()
    for serie in series:
        print(f"  {serie.get('codice_opera')}: {serie.get('titolo')} ({serie.get('anno_produzione')})")