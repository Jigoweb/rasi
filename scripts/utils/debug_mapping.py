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

def debug_mappings():
    """Debug delle mappature per capire il problema"""
    try:
        # Controllare alcuni ID specifici da newRuoli
        conn = mysql.connector.connect(**mysql_config)
        cursor = conn.cursor(dictionary=True)
        
        print("Controllando prime 10 partecipazioni da MySQL:")
        cursor.execute("SELECT * FROM newRuoli LIMIT 10")
        partecipazioni = cursor.fetchall()
        
        for p in partecipazioni:
            print(f"  MySQL: codOpera={p['codOpera']}, codArtista={p['codArtista']}, ruolo={p['ruolo']}")
        
        # Verificare se questi ID esistono in Supabase
        test_opera_ids = [p['codOpera'] for p in partecipazioni[:5]]
        test_artista_ids = [p['codArtista'] for p in partecipazioni[:5]]
        
        print(f"\nControllando se opere esistono in Supabase: {test_opera_ids}")
        for opera_id in test_opera_ids:
            response = requests.get(
                f"{supabase_url}/opere",
                headers=headers,
                params={"codice_opera": f"eq.{opera_id}", "select": "id,codice_opera,titolo"}
            )
            
            if response.status_code == 200:
                opere = response.json()
                if opere:
                    print(f"  ✓ Opera {opera_id} trovata: {opere[0]}")
                else:
                    print(f"  ✗ Opera {opera_id} NON trovata")
            else:
                print(f"  ✗ Errore ricerca opera {opera_id}: {response.status_code}")
        
        print(f"\nControllando se artisti esistono in Supabase: {test_artista_ids}")
        for artista_id in test_artista_ids:
            response = requests.get(
                f"{supabase_url}/artisti",
                headers=headers,
                params={"codice_artista": f"eq.{artista_id}", "select": "id,codice_artista,nome,cognome"}
            )
            
            if response.status_code == 200:
                artisti = response.json()
                if artisti:
                    print(f"  ✓ Artista {artista_id} trovato: {artisti[0]}")
                else:
                    print(f"  ✗ Artista {artista_id} NON trovato")
            else:
                print(f"  ✗ Errore ricerca artista {artista_id}: {response.status_code}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Errore debug: {e}")

if __name__ == "__main__":
    debug_mappings()