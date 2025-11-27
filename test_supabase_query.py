#!/usr/bin/env python3
import requests
import json

# Supabase PostgreSQL connection details (dal tuo progetto)
supabase_url = "https://jdflzupcfwdcajxfobfj.supabase.co/rest/v1"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZmx6dXBjZndkY2FqeGZvYmZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDg2MTUxOCwiZXhwIjoyMDY2NDM3NTE4fQ.Tu03Gs9pvYAnr7qqTsFHqG38O7vGGGn0xTqwIvv2UFo"

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
    "Prefer": "count=exact"
}

def execute_query(table_name, params=None):
    """Esegue una query su una tabella Supabase"""
    if params is None:
        params = {}
    
    try:
        response = requests.get(
            f"{supabase_url}/{table_name}",
            headers=headers,
            params=params
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Errore {response.status_code}: {response.text}")
            return None
            
    except Exception as e:
        print(f"Errore nella connessione: {e}")
        return None

def get_table_info(table_name):
    """Ottiene informazioni su una tabella"""
    print(f"\n=== Informazioni tabella: {table_name} ===")
    
    # Conta i record
    count_response = requests.get(
        f"{supabase_url}/{table_name}",
        headers=headers,
        params={"select": "id", "limit": 1}
    )
    
    if count_response.status_code == 200:
        # Ottieni alcuni record di esempio
        sample_data = execute_query(table_name, {"limit": 5})
        if sample_data:
            print(f"Record trovati: {len(sample_data)} (primi 5)")
            for i, record in enumerate(sample_data, 1):
                print(f"  {i}. {record}")
        else:
            print("Nessun record trovato")
    else:
        print(f"Errore nell'accesso alla tabella: {count_response.status_code}")

def custom_query_examples():
    """Esempi di query personalizzate"""
    print("\n=== Esempi di Query Personalizzate ===")
    
    # Query 1: Artisti con cognome che inizia per 'A'
    print("\n1. Artisti con cognome che inizia per 'A':")
    artists_a = execute_query("artisti", {
        "cognome": "like.A*",
        "limit": 10
    })
    if artists_a:
        for artist in artists_a:
            print(f"  - {artist.get('nome')} {artist.get('cognome')}")
    
    # Query 2: Opere con tipo specifico
    print("\n2. Opere (prime 5):")
    opere = execute_query("opere", {"limit": 5})
    if opere:
        for opera in opere:
            print(f"  - {opera.get('titolo')} ({opera.get('tipo')})")
    
    # Query 3: Partecipazioni con ruolo specifico
    print("\n3. Partecipazioni (prime 5):")
    partecipazioni = execute_query("partecipazioni", {"limit": 5})
    if partecipazioni:
        for part in partecipazioni:
            print(f"  - Opera: {part.get('cod_opera')}, Artista: {part.get('cod_artista')}")

if __name__ == "__main__":
    print("🔍 Test connessione Supabase PostgreSQL")
    
    # Test delle tabelle principali
    tables_to_check = ["artisti", "opere", "partecipazioni", "ruoli_tipologie"]
    
    for table in tables_to_check:
        get_table_info(table)
    
    # Esempi di query personalizzate
    custom_query_examples()
    
    print("\n✅ Test completato!")
