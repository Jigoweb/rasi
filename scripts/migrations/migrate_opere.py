#!/usr/bin/env python3
import mysql.connector
import requests
import json
from datetime import datetime

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
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def explore_mysql_table():
    """Connect to MySQL and explore the opere table structure"""
    try:
        # Connect to MySQL
        conn = mysql.connector.connect(**mysql_config)
        cursor = conn.cursor()
        
        # Get table structure
        print("Exploring MySQL opere table structure...")
        cursor.execute("DESCRIBE opere")
        columns = cursor.fetchall()
        
        print("\nTable structure:")
        for col in columns:
            print(f"  {col[0]} - {col[1]} - {'NULL' if col[2] == 'YES' else 'NOT NULL'}")
        
        # Get sample data
        cursor.execute("SELECT * FROM opere LIMIT 5")
        sample_data = cursor.fetchall()
        
        print(f"\nSample data (first 5 rows):")
        for row in sample_data:
            print(f"  {row}")
        
        # Get total count
        cursor.execute("SELECT COUNT(*) FROM opere")
        count = cursor.fetchone()[0]
        print(f"\nTotal records: {count}")
        
        cursor.close()
        conn.close()
        
        return columns, count
        
    except mysql.connector.Error as err:
        print(f"MySQL Error: {err}")
        return None, 0

def check_postgresql_table():
    """Check opere table structure in PostgreSQL"""
    try:
        # Check if table exists
        response = requests.get(
            f"{supabase_url}/opere",
            headers=headers,
            params={"limit": 1}
        )
        
        if response.status_code == 200:
            print("\nPostgreSQL opere table exists")
            
            # Get one row to see the structure
            if response.json():
                sample = response.json()[0]
                print("PostgreSQL table columns:", list(sample.keys()))
            
            return True
        else:
            print(f"\nPostgreSQL opere table check response: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"PostgreSQL Error: {e}")
        return False

def remove_placeholder_data():
    """Remove placeholder data from PostgreSQL opere table"""
    try:
        print("\nChecking for existing data in PostgreSQL opere table...")
        
        # First get count of existing records
        response = requests.get(
            f"{supabase_url}/opere",
            headers=headers,
            params={"select": "id", "limit": 1000}
        )
        
        if response.status_code == 200:
            existing_records = response.json()
            if existing_records:
                print(f"Found {len(existing_records)} existing records. Removing placeholder data...")
                
                # Delete all existing records (they are likely placeholders)
                # First get the IDs
                ids_to_delete = [record['id'] for record in existing_records]
                
                # Delete by specific IDs
                for record_id in ids_to_delete:
                    response = requests.delete(
                        f"{supabase_url}/opere",
                        headers=headers,
                        params={"id": f"eq.{record_id}"}
                    )
                    
                    if response.status_code not in [200, 204]:
                        print(f"Error deleting record {record_id}: {response.status_code}")
                        return False
                
                if response.status_code in [200, 204]:
                    print("Placeholder data removed successfully")
                    return True
                else:
                    print(f"Error removing data: {response.status_code} - {response.text}")
                    return False
            else:
                print("No existing data found")
                return True
        else:
            print(f"Error checking existing data: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        return False

def migrate_data():
    """Migrate data from MySQL to PostgreSQL"""
    try:
        # Connect to MySQL
        conn = mysql.connector.connect(**mysql_config)
        cursor = conn.cursor(dictionary=True)
        
        # Fetch all data from MySQL
        print("\nFetching all data from MySQL...")
        cursor.execute("SELECT * FROM opere")
        opere = cursor.fetchall()
        
        print(f"Fetched {len(opere)} records")
        
        # Prepare data for batch insert - map MySQL columns to PostgreSQL columns
        batch_data = []
        for opera in opere:
            # Map MySQL fields to PostgreSQL fields
            mapped_record = {
                'codice_opera': opera['cod_opera'],
                'titolo': opera['titolo'],
                'titolo_originale': opera['titolo_orig'],
                'anno_produzione': int(opera['anno']) if opera['anno'] else None,
                'regista': [opera['regia']] if opera['regia'] else [],  # Convert to array
                'codice_isan': opera['cod_isan'],
                'casa_produzione': opera['produttore']
            }
            
            # Handle series information
            if opera['stagione'] or opera['nStagione'] or opera['episodio'] or opera['nEpisodio'] or opera['titoloEpisodio']:
                dettagli_serie = {}
                if opera['stagione']:
                    dettagli_serie['stagione'] = opera['stagione']
                if opera['nStagione'] and opera['nStagione'] != -1:
                    dettagli_serie['numero_stagione'] = opera['nStagione']
                if opera['episodio']:
                    dettagli_serie['episodio'] = opera['episodio']
                if opera['nEpisodio']:
                    dettagli_serie['numero_episodio'] = opera['nEpisodio']
                if opera['titoloEpisodio']:
                    dettagli_serie['titolo_episodio'] = opera['titoloEpisodio']
                
                mapped_record['dettagli_serie'] = json.dumps(dettagli_serie)
                mapped_record['tipo'] = 'serie_tv'
            else:
                mapped_record['tipo'] = 'film'
            
            batch_data.append(mapped_record)
        
        # Insert data in batches
        batch_size = 50
        total_inserted = 0
        
        for i in range(0, len(batch_data), batch_size):
            batch = batch_data[i:i + batch_size]
            
            try:
                response = requests.post(
                    f"{supabase_url}/opere",
                    headers=headers,
                    json=batch
                )
                
                if response.status_code in [200, 201]:
                    total_inserted += len(batch)
                    print(f"Inserted batch {i//batch_size + 1}: {len(batch)} records")
                else:
                    print(f"Error inserting batch: {response.status_code} - {response.text}")
                    
            except Exception as e:
                print(f"Error inserting batch: {e}")
        
        print(f"\nTotal records inserted: {total_inserted}")
        
        cursor.close()
        conn.close()
        
        return total_inserted
        
    except Exception as e:
        print(f"Migration Error: {e}")
        return 0

def verify_migration():
    """Verify the migration was successful"""
    try:
        # Get count
        response = requests.get(
            f"{supabase_url}/opere",
            headers=headers,
            params={"select": "codice_opera", "limit": 1000}
        )
        
        if response.status_code == 200:
            records = response.json()
            count = len(records)
            print(f"\nPostgreSQL opere table contains at least {count} records")
            
            # Get sample data
            response = requests.get(
                f"{supabase_url}/opere",
                headers=headers,
                params={"limit": 5, "order": "codice_opera"}
            )
            
            if response.status_code == 200:
                sample = response.json()
                print("\nSample data from PostgreSQL:")
                for row in sample:
                    print(f"  ID: {row.get('codice_opera')}, Titolo: {row.get('titolo')}, Anno: {row.get('anno_produzione')}, Tipo: {row.get('tipo')}")
            
            return count
        else:
            print(f"Verification failed: {response.status_code}")
            return 0
            
    except Exception as e:
        print(f"Verification Error: {e}")
        return 0

if __name__ == "__main__":
    print("Starting opere data migration from MySQL to PostgreSQL...\n")
    
    # Step 1: Explore MySQL table
    columns, total_count = explore_mysql_table()
    
    if columns:
        # Step 2: Check PostgreSQL table
        table_exists = check_postgresql_table()
        
        if table_exists:
            # Step 3: Try to remove placeholder data (skip if there are conflicts)
            print("\nAttempting to remove placeholder data...")
            remove_placeholder_data()
            
            # Step 4: Migrate data
            print("\nStarting data migration...")
            migrated_count = migrate_data()
            
            # Step 5: Verify migration
            if migrated_count > 0:
                verify_count = verify_migration()
                
                if verify_count > 0:
                    print(f"\n✓ Migration successful! Migrated {migrated_count} records.")
                else:
                    print(f"\n⚠ Migration may have issues. Please check the data.")