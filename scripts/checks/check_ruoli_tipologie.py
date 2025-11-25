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

def check_ruoli_tipologie():
    """Verificare la tabella ruoli_tipologie"""
    try:
        response = requests.get(
            f"{supabase_url}/ruoli_tipologie",
            headers=headers,
            params={"limit": 10}
        )
        
        print(f"Stato risposta: {response.status_code}")
        
        if response.status_code == 200:
            ruoli = response.json()
            print(f"Ruoli tipologie trovati: {len(ruoli)}")
            for ruolo in ruoli:
                print(f"  - ID: {ruolo.get('id')}, Nome: {ruolo.get('nome')}, Descrizione: {ruolo.get('descrizione')}")
            return ruoli
        else:
            print(f"Errore: {response.text}")
            return []
            
    except Exception as e:
        print(f"Errore: {e}")
        return []

def create_ruoli_tipologie():
    """Creare i ruoli tipologie necessari"""
    try:
        ruoli_da_creare = [
            {
                'nome': 'Primario',
                'descrizione': 'Ruolo principale/protagonista',
                'categoria': 'recitazione'
            },
            {
                'nome': 'Comprimario',
                'descrizione': 'Ruolo di supporto/secondario', 
                'categoria': 'recitazione'
            },
            {
                'nome': 'Doppiatore Primario',
                'descrizione': 'Doppiatore del ruolo principale',
                'categoria': 'doppiaggio'
            },
            {
                'nome': 'Doppiatore Comprimario',
                'descrizione': 'Doppiatore del ruolo secondario',
                'categoria': 'doppiaggio'
            },
            {
                'nome': 'Direzione Doppiaggio',
                'descrizione': 'Direttore del doppiaggio',
                'categoria': 'direzione'
            }
        ]
        
        print("Creando ruoli tipologie...")
        created_ruoli = []
        
        for ruolo in ruoli_da_creare:
            response = requests.post(
                f"{supabase_url}/ruoli_tipologie",
                headers=headers,
                json=ruolo
            )
            
            if response.status_code in [200, 201]:
                created = response.json()
                if created:
                    ruolo_info = created[0] if isinstance(created, list) else created
                    created_ruoli.append(ruolo_info)
                    print(f"✓ Creato: {ruolo['nome']} (ID: {ruolo_info.get('id')})")
            else:
                print(f"✗ Errore creando {ruolo['nome']}: {response.status_code} - {response.text}")
        
        return created_ruoli
        
    except Exception as e:
        print(f"Errore creazione: {e}")
        return []

if __name__ == "__main__":
    print("Controllo ruoli_tipologie...\n")
    
    ruoli_esistenti = check_ruoli_tipologie()
    
    if not ruoli_esistenti:
        print("\nCreando ruoli tipologie...")
        created = create_ruoli_tipologie()
        
        if created:
            print(f"\n✓ Creati {len(created)} ruoli tipologie")
            check_ruoli_tipologie()
    else:
        print("✓ Ruoli tipologie già esistenti")