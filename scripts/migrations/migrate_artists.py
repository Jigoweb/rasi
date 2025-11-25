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
    """Connect to MySQL and explore the artisti table structure"""
    try:
        # Connect to MySQL
        conn = mysql.connector.connect(**mysql_config)
        cursor = conn.cursor()
        
        # Get table structure
        print("Exploring MySQL artisti table structure...")
        cursor.execute("DESCRIBE artisti")
        columns = cursor.fetchall()
        
        print("\nTable structure:")
        for col in columns:
            print(f"  {col[0]} - {col[1]} - {'NULL' if col[2] == 'YES' else 'NOT NULL'}")
        
        # Get sample data
        cursor.execute("SELECT * FROM artisti LIMIT 5")
        sample_data = cursor.fetchall()
        
        print(f"\nSample data (first 5 rows):")
        for row in sample_data:
            print(f"  {row}")
        
        # Get total count
        cursor.execute("SELECT COUNT(*) FROM artisti")
        count = cursor.fetchone()[0]
        print(f"\nTotal records: {count}")
        
        cursor.close()
        conn.close()
        
        return columns, count
        
    except mysql.connector.Error as err:
        print(f"MySQL Error: {err}")
        return None, 0

def check_postgresql_table():
    """Check if artisti table exists in PostgreSQL"""
    try:
        # Check if table exists
        response = requests.get(
            f"{supabase_url}/artisti",
            headers=headers,
            params={"limit": 1}
        )
        
        if response.status_code == 200:
            print("\nPostgreSQL artisti table exists")
            
            # Get one row to see the structure
            if response.json():
                sample = response.json()[0]
                print("PostgreSQL table columns:", list(sample.keys()))
            
            return True
        else:
            print(f"\nPostgreSQL artisti table check response: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"PostgreSQL Error: {e}")
        return False

def create_postgresql_table():
    """Create artist table in PostgreSQL using Supabase SQL API"""
    try:
        # First, let's check what tables exist
        response = requests.get(
            f"{supabase_url}/",
            headers=headers
        )
        print(f"\nAvailable tables response: {response.status_code}")
        
        # Since we can't create tables via REST API, we'll need to use the Supabase dashboard
        # or create it via SQL. For now, let's prepare the data structure
        print("\nTable 'artisti' needs to be created in PostgreSQL with the following structure:")
        print("CREATE TABLE artisti (")
        print("  cod_artista INTEGER PRIMARY KEY,")
        print("  nome VARCHAR(100),")
        print("  nascita DATE,")
        print("  cf VARCHAR(16),")
        print("  nconst VARCHAR(10)")
        print(");")
        
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
        cursor.execute("SELECT * FROM artisti")
        artists = cursor.fetchall()
        
        print(f"Fetched {len(artists)} records")
        
        # Prepare data for batch insert - map MySQL columns to PostgreSQL columns
        batch_data = []
        for artist in artists:
            # Split nome into nome and cognome
            full_name = artist['nome'] or ''
            
            # Try to intelligently split the name
            if '/' in full_name:
                # Handle cases like "AGRÒ DANIELA/CONTI SILVIA"
                nome = full_name
                cognome = 'ARTISTA'  # Default surname for complex names
            else:
                # Split by space and assume last word is surname
                name_parts = full_name.strip().split()
                if len(name_parts) >= 2:
                    cognome = name_parts[-1]
                    nome = ' '.join(name_parts[:-1])
                elif len(name_parts) == 1:
                    cognome = name_parts[0]
                    nome = ''
                else:
                    cognome = 'SCONOSCIUTO'
                    nome = ''
            
            # Map MySQL fields to PostgreSQL fields
            mapped_record = {
                'codice_artista': artist['cod_artista'],
                'nome': nome if nome else full_name,
                'cognome': cognome,
                'codice_fiscale': artist['cf'],
                'data_nascita': artist['nascita'].strftime('%Y-%m-%d') if artist['nascita'] else None,
                'imdb_nconst': artist['nconst']
            }
            
            batch_data.append(mapped_record)
        
        # Insert data in batches
        batch_size = 50
        total_inserted = 0
        
        for i in range(0, len(batch_data), batch_size):
            batch = batch_data[i:i + batch_size]
            
            try:
                response = requests.post(
                    f"{supabase_url}/artisti",
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
        # Get count using a different approach
        response = requests.head(
            f"{supabase_url}/artisti",
            headers={**headers, "Prefer": "count=exact"}
        )
        
        if response.status_code in [200, 206]:
            count_header = response.headers.get('content-range', '')
            if count_header:
                count = count_header.split('/')[-1]
                print(f"\nPostgreSQL artisti table contains {count} records")
            else:
                # Alternative: fetch with limit to get count
                response = requests.get(
                    f"{supabase_url}/artisti",
                    headers=headers,
                    params={"select": "codice_artista", "limit": 1000}
                )
                if response.status_code == 200:
                    records = response.json()
                    count = len(records)
                    print(f"\nPostgreSQL artisti table contains at least {count} records")
            
            # Get sample data
            response = requests.get(
                f"{supabase_url}/artisti",
                headers=headers,
                params={"limit": 5, "order": "codice_artista"}
            )
            
            if response.status_code == 200:
                sample = response.json()
                print("\nSample data from PostgreSQL:")
                for row in sample:
                    print(f"  ID: {row.get('codice_artista')}, Nome: {row.get('nome')}, Cognome: {row.get('cognome')}")
            
            return int(count) if count and count != '*' else 0
        else:
            print(f"Verification failed: {response.status_code}")
            return 0
            
    except Exception as e:
        print(f"Verification Error: {e}")
        return 0

if __name__ == "__main__":
    print("Starting artist data migration from MySQL to PostgreSQL...\n")
    
    # Step 1: Explore MySQL table
    columns, total_count = explore_mysql_table()
    
    if columns:
        # Step 2: Check PostgreSQL table
        table_exists = check_postgresql_table()
        
        if not table_exists:
            print("\n" + "="*60)
            print("IMPORTANT: The 'artisti' table does not exist in PostgreSQL.")
            print("Please create it using the Supabase dashboard or SQL editor with:")
            print("="*60)
            create_postgresql_table()
            print("="*60)
        
        if table_exists:
            # Step 3: Migrate data
            print("\nStarting data migration...")
            migrated_count = migrate_data()
            
            # Step 4: Verify migration
            if migrated_count > 0:
                verify_count = verify_migration()
                
                if verify_count == total_count:
                    print(f"\n✓ Migration successful! All {total_count} records migrated.")
                else:
                    print(f"\n⚠ Migration incomplete. Expected {total_count}, found {verify_count}")
        else:
            print("\nCannot proceed without the artisti table in PostgreSQL.")