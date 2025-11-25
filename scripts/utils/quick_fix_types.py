#!/usr/bin/env python3
import mysql.connector
import requests

# MySQL connection details
mysql_config = {
    'host': '86.105.14.112',
    'user': 'instance_admin',
    'password': 'Ml<(e2_Krt*B',
    'database': 'rasi'
}

# Supabase PostgreSQL connection details
supabase_url = "https://jdflzupcfwdcajxfobfj.supabase.co/rest/v1"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZmx6dXBjZndkY2FqeGZvYmZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDg2MTUxOCwiZXhwIjoyMDY2NDM3NTE4fQ.Tu03Gs9pvYAnr7qqTsFHqG38O7vGGGn0xTqwIvv2UFo"

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json"
}

def get_film_ids():
    """Get IDs that should be films from MySQL"""
    try:
        conn = mysql.connector.connect(**mysql_config)
        cursor = conn.cursor()
        
        # Get all records that should be films (no significant series data)
        cursor.execute("""
            SELECT cod_opera 
            FROM opere 
            WHERE NOT (
                (stagione IS NOT NULL AND stagione != '') 
                OR (nStagione IS NOT NULL AND nStagione > 0)
                OR (episodio IS NOT NULL AND episodio != '')
                OR (nEpisodio IS NOT NULL AND nEpisodio > 0)
                OR (titoloEpisodio IS NOT NULL AND titoloEpisodio != '')
            )
            ORDER BY cod_opera
        """)
        
        film_ids = [row[0] for row in cursor.fetchall()]
        
        cursor.close()
        conn.close()
        
        print(f"Found {len(film_ids)} records that should be films")
        return film_ids
        
    except Exception as e:
        print(f"Error: {e}")
        return []

def update_films_in_batches(film_ids):
    """Update films in small batches"""
    batch_size = 50
    updated_count = 0
    
    for i in range(0, len(film_ids), batch_size):
        batch = film_ids[i:i + batch_size]
        
        # Create OR condition for this batch
        or_conditions = [f"codice_opera.eq.{film_id}" for film_id in batch]
        or_query = ",".join(or_conditions)
        
        try:
            response = requests.patch(
                f"{supabase_url}/opere",
                headers=headers,
                params={"or": f"({or_query})"},
                json={"tipo": "film", "dettagli_serie": None}
            )
            
            if response.status_code in [200, 204]:
                updated_count += len(batch)
                print(f"Updated batch {i//batch_size + 1}: {len(batch)} records -> films (total: {updated_count})")
            else:
                print(f"Error updating batch {i//batch_size + 1}: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"Error updating batch {i//batch_size + 1}: {e}")
    
    return updated_count

def verify_results():
    """Verify the updated types"""
    try:
        response = requests.get(
            f"{supabase_url}/opere",
            headers=headers,
            params={"select": "tipo", "limit": 50000}
        )
        
        if response.status_code == 200:
            records = response.json()
            
            type_counts = {}
            for record in records:
                tipo = record.get('tipo', 'unknown')
                type_counts[tipo] = type_counts.get(tipo, 0) + 1
            
            print(f"\nFinal type distribution:")
            for tipo, count in sorted(type_counts.items()):
                print(f"  {tipo}: {count}")
            
            return type_counts
        else:
            print(f"Error verifying: {response.status_code}")
            return {}
            
    except Exception as e:
        print(f"Verification error: {e}")
        return {}

if __name__ == "__main__":
    print("Quick fix for opere types...\n")
    
    # Step 1: Get film IDs from MySQL
    film_ids = get_film_ids()
    
    if film_ids:
        # Step 2: Update in batches
        print(f"\nUpdating {len(film_ids)} records to 'film' type...")
        updated = update_films_in_batches(film_ids)
        
        # Step 3: Verify results
        print(f"\nUpdated {updated} records total")
        verify_results()
    else:
        print("No film IDs found to update")