#!/usr/bin/env python3
import requests

# Supabase PostgreSQL connection details
supabase_url = "https://jdflzupcfwdcajxfobfj.supabase.co/rest/v1"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZmx6dXBjZndkY2FqeGZvYmZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDg2MTUxOCwiZXhwIjoyMDY2NDM3NTE4fQ.Tu03Gs9pvYAnr7qqTsFHqG38O7vGGGn0xTqwIvv2UFo"

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