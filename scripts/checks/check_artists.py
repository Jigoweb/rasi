#!/usr/bin/env python3
import os
import requests

# Supabase PostgreSQL connection details
supabase_url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1"
supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
    "Prefer": "count=exact"
}

# Get count
response = requests.get(
    f"{supabase_url}/artisti",
    headers=headers,
    params={"select": "codice_artista", "limit": 1000}
)

if response.status_code == 200:
    records = response.json()
    print(f"\nPostgreSQL artisti table contains {len(records)} records")
    
    # Get sample data
    response = requests.get(
        f"{supabase_url}/artisti",
        headers=headers,
        params={"limit": 10, "order": "codice_artista"}
    )
    
    if response.status_code == 200:
        sample = response.json()
        print("\nFirst 10 records:")
        for row in sample:
            print(f"  ID: {row.get('codice_artista')}, Nome: {row.get('nome')}, Cognome: {row.get('cognome')}, IMDB: {row.get('imdb_nconst')}")
else:
    print(f"Error: {response.status_code} - {response.text}")