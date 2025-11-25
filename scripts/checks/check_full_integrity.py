import requests
import json

# Supabase PostgreSQL connection details
supabase_url = "https://jdflzupcfwdcajxfobfj.supabase.co/rest/v1"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZmx6dXBjZndkY2FqeGZvYmZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDg2MTUxOCwiZXhwIjoyMDY2NDM3NTE4fQ.Tu03Gs9pvYAnr7qqTsFHqG38O7vGGGn0xTqwIvv2UFo"

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json"
}

def check_orphans_debug():
    print("Debugging orphans check...")
    
    # Replicate verify_partecipazioni_final.py logic
    print("  Checking orphans (artist is null) via select=count...")
    response = requests.get(
        f"{supabase_url}/partecipazioni",
        headers=headers,
        params={
            "select": "count",
            "artista_id": "is.null"
        }
    )
    print(f"  Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  Response data (len={len(data)}): {data}")
    
    # Try with valid PostgREST syntax for count
    print("  Checking orphans (artist is null) via Prefer: count=exact...")
    response = requests.get(
        f"{supabase_url}/partecipazioni",
        headers={**headers, "Prefer": "count=exact"},
        params={
            "select": "id",
            "artista_id": "is.null",
            "limit": 1  # We only need the count header, but let's see if we get rows
        }
    )
    cr = response.headers.get('content-range', 'unknown')
    print(f"  Content-Range: {cr}")
    print(f"  Response body: {response.json()}")

def check_role_distribution_full():
    print("\nChecking FULL role distribution...")
    
    # Get roles
    roles_map = {}
    r_resp = requests.get(f"{supabase_url}/ruoli_tipologie", headers=headers)
    if r_resp.status_code == 200:
        for r in r_resp.json():
            roles_map[r['id']] = r['nome']
    
    total_count = 0
    
    # Count for each role
    for rid, rname in roles_map.items():
        response = requests.get(
            f"{supabase_url}/partecipazioni",
            headers={**headers, "Prefer": "count=exact"},
            params={
                "select": "count", # Note: select=count isn't standard for count-only, but let's use head method or just limit=0
                "ruolo_id": f"eq.{rid}",
                "limit": 0
            }
        )
        # Using HEAD is better for counting, but let's stick to GET with limit=0 and count=exact
        cr = response.headers.get('content-range')
        if cr:
            count = int(cr.split('/')[-1])
            print(f"  - {rname} ({rid}): {count}")
            total_count += count
        else:
            print(f"  - {rname}: Failed to get count")

    # Count NULL roles
    response = requests.get(
        f"{supabase_url}/partecipazioni",
        headers={**headers, "Prefer": "count=exact"},
        params={
            "ruolo_id": "is.null",
            "limit": 0
        }
    )
    cr = response.headers.get('content-range')
    if cr:
        count = int(cr.split('/')[-1])
        print(f"  - NULL ROLE: {count}")
        total_count += count
        
    print(f"Total counted: {total_count}")

if __name__ == "__main__":
    check_orphans_debug()
    check_role_distribution_full()
