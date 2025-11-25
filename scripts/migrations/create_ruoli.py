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

def create_ruoli():
    """Creare i ruoli di base in Supabase"""
    try:
        # I ruoli che troviamo in MySQL
        ruoli_da_creare = [
            {
                'nome': 'Primario',
                'descrizione': 'Ruolo principale/protagonista',
                'categoria': 'recitazione',
                'attivo': True
            },
            {
                'nome': 'Comprimario', 
                'descrizione': 'Ruolo di supporto/secondario',
                'categoria': 'recitazione',
                'attivo': True
            },
            {
                'nome': 'Doppiatore Primario',
                'descrizione': 'Doppiatore del ruolo principale',
                'categoria': 'doppiaggio',
                'attivo': True
            },
            {
                'nome': 'Doppiatore Comprimario',
                'descrizione': 'Doppiatore del ruolo secondario',
                'categoria': 'doppiaggio', 
                'attivo': True
            },
            {
                'nome': 'Direzione Doppiaggio',
                'descrizione': 'Direttore del doppiaggio',
                'categoria': 'direzione',
                'attivo': True
            }
        ]
        
        print("Creando ruoli in Supabase...")
        
        ruoli_creati = []
        for ruolo in ruoli_da_creare:
            response = requests.post(
                f"{supabase_url}/ruoli",
                headers=headers,
                json=ruolo
            )
            
            if response.status_code in [200, 201]:
                created = response.json()
                if created:
                    ruolo_info = created[0] if isinstance(created, list) else created
                    ruoli_creati.append(ruolo_info)
                    print(f"✓ Creato ruolo: {ruolo['nome']} (ID: {ruolo_info.get('id')})")
                else:
                    print(f"✗ Errore creazione ruolo {ruolo['nome']}: risposta vuota")
            else:
                print(f"✗ Errore creazione ruolo {ruolo['nome']}: {response.status_code} - {response.text}")
        
        return ruoli_creati
        
    except Exception as e:
        print(f"Errore creazione ruoli: {e}")
        return []

def verify_ruoli():
    """Verificare i ruoli creati"""
    try:
        response = requests.get(
            f"{supabase_url}/ruoli",
            headers=headers,
            params={"select": "*", "limit": 20}
        )
        
        if response.status_code == 200:
            ruoli = response.json()
            print(f"\nRuoli disponibili in Supabase: {len(ruoli)}")
            for ruolo in ruoli:
                print(f"  - {ruolo.get('nome')} (ID: {ruolo.get('id')}) - {ruolo.get('descrizione')}")
            return ruoli
        else:
            print(f"Errore verifica ruoli: {response.status_code}")
            return []
            
    except Exception as e:
        print(f"Errore verifica ruoli: {e}")
        return []

if __name__ == "__main__":
    print("Creazione ruoli per partecipazioni...\n")
    
    # Prima verificare se esistono già
    ruoli_esistenti = verify_ruoli()
    
    if not ruoli_esistenti:
        # Creare i ruoli
        ruoli_creati = create_ruoli()
        
        if ruoli_creati:
            print(f"\n✓ Creati {len(ruoli_creati)} ruoli")
            verify_ruoli()
        else:
            print("\n✗ Nessun ruolo creato")
    else:
        print("✓ Ruoli già esistenti")