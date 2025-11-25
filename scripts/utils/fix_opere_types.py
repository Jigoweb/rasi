#!/usr/bin/env python3
import mysql.connector
import requests
import json

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

def analyze_mysql_data():
    """Analyze MySQL data to understand the categorization"""
    try:
        conn = mysql.connector.connect(**mysql_config)
        cursor = conn.cursor(dictionary=True)
        
        # Analyze series vs films
        cursor.execute("""
            SELECT 
                cod_opera,
                titolo,
                stagione,
                nStagione,
                episodio,
                nEpisodio,
                titoloEpisodio,
                CASE 
                    WHEN (stagione IS NOT NULL AND stagione != '') 
                         OR (nStagione IS NOT NULL AND nStagione > 0)
                         OR (episodio IS NOT NULL AND episodio != '')
                         OR (nEpisodio IS NOT NULL AND nEpisodio > 0)
                         OR (titoloEpisodio IS NOT NULL AND titoloEpisodio != '')
                    THEN 'serie_tv'
                    ELSE 'film'
                END as should_be_type
            FROM opere 
            ORDER BY cod_opera
            LIMIT 100
        """)
        
        samples = cursor.fetchall()
        
        print("Sample MySQL data analysis:")
        print("ID | Titolo | Stagione | nStagione | Episodio | nEpisodio | TitoloEpisodio | Should be")
        print("-" * 100)
        
        serie_count = 0
        film_count = 0
        
        for sample in samples:
            should_be = sample['should_be_type']
            if should_be == 'serie_tv':
                serie_count += 1
            else:
                film_count += 1
                
            print(f"{sample['cod_opera']} | {(sample['titolo'] or '')[:20]:20} | {sample['stagione'] or ''} | {sample['nStagione'] or ''} | {sample['episodio'] or ''} | {sample['nEpisodio'] or ''} | {sample['titoloEpisodio'] or ''} | {should_be}")
        
        print(f"\nIn first 100 records:")
        print(f"Should be serie_tv: {serie_count}")
        print(f"Should be film: {film_count}")
        
        # Get total counts
        cursor.execute("""
            SELECT 
                SUM(CASE 
                    WHEN (stagione IS NOT NULL AND stagione != '') 
                         OR (nStagione IS NOT NULL AND nStagione > 0)
                         OR (episodio IS NOT NULL AND episodio != '')
                         OR (nEpisodio IS NOT NULL AND nEpisodio > 0)
                         OR (titoloEpisodio IS NOT NULL AND titoloEpisodio != '')
                    THEN 1 ELSE 0
                END) as total_series,
                SUM(CASE 
                    WHEN NOT ((stagione IS NOT NULL AND stagione != '') 
                             OR (nStagione IS NOT NULL AND nStagione > 0)
                             OR (episodio IS NOT NULL AND episodio != '')
                             OR (nEpisodio IS NOT NULL AND nEpisodio > 0)
                             OR (titoloEpisodio IS NOT NULL AND titoloEpisodio != ''))
                    THEN 1 ELSE 0
                END) as total_films
            FROM opere
        """)
        
        totals = cursor.fetchone()
        print(f"\nTotal in MySQL:")
        print(f"Should be serie_tv: {totals['total_series']}")
        print(f"Should be film: {totals['total_films']}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

def fix_postgresql_types():
    """Fix the types in PostgreSQL based on correct logic"""
    try:
        # Connect to MySQL to get the correct categorization
        conn = mysql.connector.connect(**mysql_config)
        cursor = conn.cursor(dictionary=True)
        
        print("\nFetching MySQL data for correct categorization...")
        cursor.execute("SELECT * FROM opere ORDER BY cod_opera")
        opere = cursor.fetchall()
        
        print(f"Processing {len(opere)} records...")
        
        film_updates = []
        serie_updates = []
        
        for opera in opere:
            # Correct logic for categorization
            is_series = (
                (opera['stagione'] and opera['stagione'].strip() != '') or
                (opera['nStagione'] and opera['nStagione'] > 0) or
                (opera['episodio'] and opera['episodio'].strip() != '') or
                (opera['nEpisodio'] and opera['nEpisodio'] > 0) or
                (opera['titoloEpisodio'] and opera['titoloEpisodio'].strip() != '')
            )
            
            if is_series:
                serie_updates.append(opera['cod_opera'])
            else:
                film_updates.append(opera['cod_opera'])
        
        print(f"Should be films: {len(film_updates)}")
        print(f"Should be series: {len(serie_updates)}")
        
        # Update films in batches
        print("\nUpdating films...")
        batch_size = 100
        for i in range(0, len(film_updates), batch_size):
            batch = film_updates[i:i + batch_size]
            
            for cod_opera in batch:
                response = requests.patch(
                    f"{supabase_url}/opere",
                    headers=headers,
                    params={"codice_opera": f"eq.{cod_opera}"},
                    json={"tipo": "film", "dettagli_serie": None}
                )
                
                if response.status_code not in [200, 204]:
                    print(f"Error updating {cod_opera}: {response.status_code}")
            
            print(f"Updated batch {i//batch_size + 1} of films")
        
        # Update series in batches
        print("\nUpdating series...")
        for i in range(0, len(serie_updates), batch_size):
            batch = serie_updates[i:i + batch_size]
            
            for cod_opera in batch:
                response = requests.patch(
                    f"{supabase_url}/opere",
                    headers=headers,
                    params={"codice_opera": f"eq.{cod_opera}"},
                    json={"tipo": "serie_tv"}
                )
                
                if response.status_code not in [200, 204]:
                    print(f"Error updating {cod_opera}: {response.status_code}")
            
            print(f"Updated batch {i//batch_size + 1} of series")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Analyzing MySQL data to fix PostgreSQL categorization...\n")
    
    if analyze_mysql_data():
        print("\n" + "="*60)
        print("Proceeding with fixing PostgreSQL types...")
        fix_postgresql_types()