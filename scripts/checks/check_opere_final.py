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

# Get all records to get exact count
response = requests.get(
    f"{supabase_url}/opere",
    headers=headers,
    params={"select": "codice_opera,titolo,tipo,anno_produzione", "limit": 20000}
)

if response.status_code == 200:
    records = response.json()
    print(f"Total records in PostgreSQL opere table: {len(records)}")
    
    # Count by type
    films = sum(1 for r in records if r.get('tipo') == 'film')
    series = sum(1 for r in records if r.get('tipo') == 'serie_tv')
    
    print(f"Films: {films}")
    print(f"TV Series: {series}")
    
    # Show some sample records
    print("\nSample records:")
    for i, record in enumerate(records[:10]):
        print(f"  {record.get('codice_opera')}: {record.get('titolo')} ({record.get('anno_produzione')}) - {record.get('tipo')}")
else:
    print(f"Error: {response.status_code}")