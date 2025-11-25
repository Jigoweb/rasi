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

def verify_final_partecipazioni():
    """Verifica finale completa delle partecipazioni"""
    try:
        # Conteggio totale
        response = requests.head(
            f"{supabase_url}/partecipazioni",
            headers={**headers, "Prefer": "count=exact"}
        )
        
        if response.status_code in [200, 206]:
            count_header = response.headers.get('content-range', '')
            if count_header:
                total_count = count_header.split('/')[-1]
                print(f"📊 Totale partecipazioni: {total_count}")
        
        # Distribuzione per ruolo
        print("\n📋 Distribuzione per ruolo:")
        response = requests.get(
            f"{supabase_url}/partecipazioni",
            headers=headers,
            params={
                "select": "ruoli_tipologie(nome)",
                "limit": 20000
            }
        )
        
        if response.status_code == 200:
            partecipazioni = response.json()
            ruoli_count = {}
            for p in partecipazioni:
                ruolo_nome = p.get('ruoli_tipologie', {}).get('nome', 'Sconosciuto')
                ruoli_count[ruolo_nome] = ruoli_count.get(ruolo_nome, 0) + 1
            
            for ruolo, count in sorted(ruoli_count.items()):
                print(f"  • {ruolo}: {count}")
        
        # Esempi di partecipazioni con relazioni
        print("\n🎭 Esempi di partecipazioni:")
        response = requests.get(
            f"{supabase_url}/partecipazioni",
            headers=headers,
            params={
                "select": "id,artisti(nome,cognome),opere(titolo),ruoli_tipologie(nome),note",
                "limit": 10
            }
        )
        
        if response.status_code == 200:
            examples = response.json()
            for i, ex in enumerate(examples, 1):
                artista = ex.get('artisti', {})
                opera = ex.get('opere', {})
                ruolo = ex.get('ruoli_tipologie', {})
                note = ex.get('note', '')
                
                artista_nome = f"{artista.get('nome', '')} {artista.get('cognome', '')}"
                opera_titolo = opera.get('titolo', 'N/A')
                ruolo_nome = ruolo.get('nome', 'N/A')
                
                print(f"  {i}. {artista_nome.strip()} in '{opera_titolo}' come {ruolo_nome}")
                if note:
                    print(f"     Note: {note}")
        
        # Verifica integrità relazioni
        print("\n🔗 Verifica integrità relazioni:")
        
        # Partecipazioni senza artista
        response = requests.get(
            f"{supabase_url}/partecipazioni",
            headers=headers,
            params={
                "select": "count",
                "artista_id": "is.null"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            # Handle list of dicts like [{'count': 0}]
            if isinstance(data, list) and len(data) > 0 and 'count' in data[0]:
                orphaned = data[0]['count']
            else:
                orphaned = len(data) # Fallback if behavior changes
            print(f"  • Partecipazioni senza artista: {orphaned}")
        
        # Partecipazioni senza opera
        response = requests.get(
            f"{supabase_url}/partecipazioni",
            headers=headers,
            params={
                "select": "count",
                "opera_id": "is.null"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0 and 'count' in data[0]:
                orphaned = data[0]['count']
            else:
                orphaned = len(data)
            print(f"  • Partecipazioni senza opera: {orphaned}")
        
        # Statistiche per opera più popolare
        print("\n🏆 Top 5 opere con più partecipazioni:")
        response = requests.get(
            f"{supabase_url}/partecipazioni",
            headers=headers,
            params={
                "select": "opere(titolo)",
                "limit": 5000
            }
        )
        
        if response.status_code == 200:
            partecipazioni = response.json()
            opere_count = {}
            for p in partecipazioni:
                titolo = p.get('opere', {}).get('titolo', 'N/A')
                opere_count[titolo] = opere_count.get(titolo, 0) + 1
            
            # Ordinare per numero di partecipazioni
            top_opere = sorted(opere_count.items(), key=lambda x: x[1], reverse=True)[:5]
            for i, (titolo, count) in enumerate(top_opere, 1):
                print(f"  {i}. {titolo}: {count} partecipazioni")
        
        return True
        
    except Exception as e:
        print(f"Errore verifica: {e}")
        return False

if __name__ == "__main__":
    print("🎬 VERIFICA FINALE PARTECIPAZIONI")
    print("="*50)
    
    if verify_final_partecipazioni():
        print("\n✅ Verifica completata con successo!")
    else:
        print("\n❌ Errori durante la verifica")