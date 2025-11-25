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

def explore_mysql_tables():
    """Esplorare le tabelle MySQL per trovare le relazioni artisti-opere"""
    try:
        conn = mysql.connector.connect(**mysql_config)
        cursor = conn.cursor()
        
        # Prima controllare quali tabelle esistono
        print("Tabelle disponibili nel database MySQL:")
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        for table in tables:
            print(f"  - {table[0]}")
        
        # Cercare tabelle che potrebbero contenere relazioni
        relation_tables = []
        for table in tables:
            table_name = table[0]
            if any(keyword in table_name.lower() for keyword in ['partecipa', 'cast', 'credits', 'ruol', 'artisti_opere']):
                relation_tables.append(table_name)
        
        print(f"\nTabelle potenziali per relazioni artisti-opere:")
        for table in relation_tables:
            print(f"  - {table}")
        
        # Esplorare ogni tabella potenziale
        for table_name in relation_tables:
            print(f"\n{'='*50}")
            print(f"Struttura tabella: {table_name}")
            print(f"{'='*50}")
            
            try:
                cursor.execute(f"DESCRIBE {table_name}")
                columns = cursor.fetchall()
                
                print("Colonne:")
                for col in columns:
                    print(f"  {col[0]} - {col[1]} - {'NULL' if col[2] == 'YES' else 'NOT NULL'}")
                
                # Ottenere alcuni dati di esempio
                cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
                sample_data = cursor.fetchall()
                
                print(f"\nDati di esempio (prime 5 righe):")
                for row in sample_data:
                    print(f"  {row}")
                
                # Contare i record totali
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                print(f"\nTotale record: {count}")
                
            except Exception as e:
                print(f"Errore nell'esplorare {table_name}: {e}")
        
        cursor.close()
        conn.close()
        
        return relation_tables
        
    except mysql.connector.Error as err:
        print(f"Errore MySQL: {err}")
        return []

def check_supabase_partecipazioni():
    """Verificare la struttura della tabella partecipazioni in Supabase"""
    try:
        print(f"\n{'='*50}")
        print("Struttura tabella partecipazioni in Supabase")
        print(f"{'='*50}")
        
        # Verificare se la tabella esiste
        response = requests.get(
            f"{supabase_url}/partecipazioni",
            headers=headers,
            params={"limit": 1}
        )
        
        if response.status_code == 200:
            print("✓ Tabella partecipazioni esiste in Supabase")
            
            # Ottenere una riga per vedere la struttura
            if response.json():
                sample = response.json()[0]
                print("Colonne disponibili:")
                for col in sample.keys():
                    print(f"  - {col}")
            else:
                print("Tabella vuota, controllando struttura tramite schema...")
        else:
            print(f"✗ Tabella partecipazioni non trovata: {response.status_code}")
            print(response.text)
            return False
            
        return True
        
    except Exception as e:
        print(f"Errore Supabase: {e}")
        return False

if __name__ == "__main__":
    print("Esplorazione delle relazioni artisti-opere...\n")
    
    # Step 1: Esplorare MySQL
    mysql_tables = explore_mysql_tables()
    
    # Step 2: Verificare Supabase
    supabase_ok = check_supabase_partecipazioni()
    
    print(f"\n{'='*60}")
    print("RIEPILOGO")
    print(f"{'='*60}")
    print(f"Tabelle relazioni trovate in MySQL: {len(mysql_tables)}")
    for table in mysql_tables:
        print(f"  - {table}")
    print(f"Tabella partecipazioni in Supabase: {'✓' if supabase_ok else '✗'}")