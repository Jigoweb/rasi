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

# Get total count with proper count header
print("Getting total count...")
response = requests.head(
    f"{supabase_url}/opere",
    headers=headers
)

if response.status_code in [200, 206]:
    count_header = response.headers.get('content-range', '')
    if count_header:
        total_count = count_header.split('/')[-1]
        print(f"Total records: {total_count}")

# Check type distribution
print("\nChecking type distribution...")
response = requests.get(
    f"{supabase_url}/opere",
    headers=headers,
    params={"select": "tipo", "limit": 50000}
)

if response.status_code == 200:
    records = response.json()
    print(f"Retrieved {len(records)} records for analysis")
    
    # Count by type
    type_counts = {}
    for record in records:
        tipo = record.get('tipo', 'unknown')
        type_counts[tipo] = type_counts.get(tipo, 0) + 1
    
    print("\nType distribution:")
    for tipo, count in sorted(type_counts.items()):
        print(f"  {tipo}: {count}")

# Check some non-series records from MySQL data
print("\nLooking for films/documentaries in the data...")
response = requests.get(
    f"{supabase_url}/opere",
    headers=headers,
    params={
        "select": "codice_opera,titolo,tipo,dettagli_serie",
        "tipo": "eq.film",
        "limit": 10
    }
)

if response.status_code == 200:
    films = response.json()
    print(f"\nFound {len(films)} films:")
    for film in films:
        print(f"  {film.get('codice_opera')}: {film.get('titolo')}")

# Check records without series info
print("\nChecking records that should be films (no series details)...")
response = requests.get(
    f"{supabase_url}/opere",
    headers=headers,
    params={
        "select": "codice_opera,titolo,tipo,dettagli_serie",
        "dettagli_serie": "is.null",
        "limit": 20
    }
)

if response.status_code == 200:
    potential_films = response.json()
    print(f"\nFound {len(potential_films)} records without series details:")
    for record in potential_films:
        print(f"  {record.get('codice_opera')}: {record.get('titolo')} - {record.get('tipo')}")