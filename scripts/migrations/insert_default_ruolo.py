#!/usr/bin/env python3
import requests

# Supabase PostgreSQL connection details
supabase_url = "https://jdflzupcfwdcajxfobfj.supabase.co/rest/v1"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZmx6dXBjZndkY2FqeGZvYmZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDg2MTUxOCwiZXhwIjoyMDY2NDM3NTE4fQ.Tu03Gs9pvYAnr7qqTsFHqG38O7vGGGn0xTqwIvv2UFo"

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json"
}

def insert_default_ruolo():
    """Inserire direttamente un ruolo usando un INSERT SQL raw"""
    try:
        # Poiché la tabella ruoli non è accessibile via REST API, 
        # provo a inserire direttamente nella tabella partecipazioni
        # con un ruolo_id fittizio per vedere la struttura
        
        print("Tentativo di inserimento di test per vedere gli errori...")
        
        # Inserire un record di test per capire la struttura
        test_record = {
            'artista_id': 'a13315c3-92b1-4086-b413-8e3c30048748',  # ID di un artista esistente
            'opera_id': '58ba33b9-18d3-4fb8-bd48-863b70cf41b3',      # ID di un'opera esistente
            'ruolo_id': '00000000-0000-0000-0000-000000000001',      # ID fittizio
            'note': 'Test',
            'stato_validazione': 'validato'
        }
        
        response = requests.post(
            f"{supabase_url}/partecipazioni",
            headers=headers,
            json=test_record
        )
        
        print(f"Risposta test: {response.status_code}")
        print(f"Contenuto: {response.text}")
        
        # Anche se fallisce, ci darà informazioni sulla struttura
        
    except Exception as e:
        print(f"Errore: {e}")

if __name__ == "__main__":
    insert_default_ruolo()