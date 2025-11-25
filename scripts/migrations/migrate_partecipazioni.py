#!/usr/bin/env python3
import mysql.connector
import requests
import json
from collections import defaultdict

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

def check_ruoli_table():
    """Verificare se esiste una tabella ruoli_tipologie in Supabase"""
    try:
        response = requests.get(
            f"{supabase_url}/ruoli_tipologie",
            headers=headers,
            params={"limit": 20}
        )
        
        if response.status_code == 200:
            ruoli = response.json()
            print("✓ Tabella ruoli_tipologie trovata in Supabase:")
            for ruolo in ruoli:
                print(f"  - ID: {ruolo.get('id')}, Nome: {ruolo.get('nome')}")
            return ruoli
        else:
            print(f"✗ Tabella ruoli_tipologie non trovata: {response.status_code}")
            return []
            
    except Exception as e:
        print(f"Errore controllo ruoli: {e}")
        return []

def create_id_mappings():
    """Creare le mappature tra MySQL e Supabase per artisti e opere"""
    try:
        print("Creando mappature ID tra MySQL e Supabase...")
        
        # Mappatura artisti: MySQL cod_artista -> Supabase id
        print("Caricando mappatura artisti...")
        response = requests.get(
            f"{supabase_url}/artisti",
            headers=headers,
            params={"select": "id,codice_artista", "limit": 1000}
        )
        
        artisti_map = {}
        if response.status_code == 200:
            artisti = response.json()
            for artista in artisti:
                mysql_id = artista.get('codice_artista')
                supabase_id = artista.get('id')
                if mysql_id and supabase_id:
                    try:
                        # Provare a convertire mysql_id in intero
                        key = int(mysql_id)
                        artisti_map[key] = supabase_id
                    except ValueError:
                        # Se non è un numero, mantenere come stringa
                        artisti_map[mysql_id] = supabase_id
            print(f"Mappati {len(artisti_map)} artisti")
        else:
            print(f"Errore caricamento artisti: {response.status_code}")
            return {}, {}
        
        # Mappatura opere: MySQL cod_opera -> Supabase id  
        print("Caricando mappatura opere...")
        opere_map = {}
        offset = 0
        limit = 1000
        
        while True:
            response = requests.get(
                f"{supabase_url}/opere",
                headers=headers,
                params={"select": "id,codice_opera", "limit": limit, "offset": offset}
            )
            
            if response.status_code != 200:
                print(f"Errore caricamento opere: {response.status_code}")
                break
            
            opere_batch = response.json()
            if not opere_batch:
                break
            
            for opera in opere_batch:
                mysql_id = opera.get('codice_opera')
                supabase_id = opera.get('id')
                if mysql_id and supabase_id:
                    try:
                        # Provare a convertire mysql_id in intero
                        key = int(mysql_id)
                        opere_map[key] = supabase_id
                    except ValueError:
                        # Se non è un numero, mantenere come stringa
                        opere_map[mysql_id] = supabase_id
            
            print(f"Caricate {len(opere_batch)} opere (totale: {len(opere_map)})")
            offset += limit
            
            # Se il batch è più piccolo del limite, abbiamo finito
            if len(opere_batch) < limit:
                break
        
        print(f"Mappate {len(opere_map)} opere totali")
        
        return artisti_map, opere_map
        
    except Exception as e:
        print(f"Errore creazione mappature: {e}")
        return {}, {}

def create_ruolo_mapping(ruoli_supabase):
    """Creare mappatura tra ruoli MySQL e Supabase"""
    # Mappatura ruoli MySQL -> Supabase
    ruolo_map = {}
    
    for ruolo in ruoli_supabase:
        nome = ruolo.get('nome', '').lower()
        ruolo_id = ruolo.get('id')
        
        # Mappare i ruoli MySQL ai ruoli Supabase basandosi sui nomi
        if nome == 'protagonista primario':
            ruolo_map['Primario'] = ruolo_id
        elif nome == 'comprimario primario':
            ruolo_map['Comprimario'] = ruolo_id
        elif nome == 'doppiatore primario':
            ruolo_map['Doppiatore Primario'] = ruolo_id
        elif nome == 'doppiatore secondario':
            ruolo_map['Doppiatore Comprimario'] = ruolo_id
        elif nome == 'direzione doppiaggio':
            ruolo_map['Direzione Doppiaggio'] = ruolo_id
    
    return ruolo_map

def extract_partecipazioni():
    """Estrarre le partecipazioni da MySQL"""
    try:
        conn = mysql.connector.connect(**mysql_config)
        cursor = conn.cursor(dictionary=True)
        
        # Estrarre tutti i dati da newRuoli
        print("Estraendo partecipazioni da MySQL...")
        cursor.execute("""
            SELECT 
                idRel,
                codOpera,
                codArtista,
                ruolo
            FROM newRuoli
            ORDER BY idRel
        """)
        
        partecipazioni = cursor.fetchall()
        print(f"Estratte {len(partecipazioni)} partecipazioni")
        
        # Analizzare i ruoli disponibili
        ruoli_count = defaultdict(int)
        for p in partecipazioni:
            ruoli_count[p['ruolo']] += 1
        
        print("Distribuzione ruoli:")
        for ruolo, count in ruoli_count.items():
            print(f"  {ruolo}: {count}")
        
        cursor.close()
        conn.close()
        
        return partecipazioni
        
    except Exception as e:
        print(f"Errore estrazione partecipazioni: {e}")
        return []

def migrate_partecipazioni(partecipazioni, artisti_map, opere_map, ruolo_map):
    """Migrare le partecipazioni in Supabase"""
    try:
        print(f"\nMigrando {len(partecipazioni)} partecipazioni in Supabase...")
        
        batch_data = []
        skipped_count = 0
        
        for partecipazione in partecipazioni:
            mysql_artista = partecipazione['codArtista']
            mysql_opera = partecipazione['codOpera']
            mysql_ruolo = partecipazione['ruolo']
            
            # Verificare che esistano le mappature
            if mysql_artista not in artisti_map:
                skipped_count += 1
                continue
                
            if mysql_opera not in opere_map:
                skipped_count += 1
                continue
            
            # Mappare gli ID
            artista_id = artisti_map[mysql_artista]
            opera_id = opere_map[mysql_opera]
            ruolo_id = ruolo_map.get(mysql_ruolo)
            
            # Creare il record per Supabase
            record = {
                'artista_id': artista_id,
                'opera_id': opera_id,
                'ruolo_id': ruolo_id,  # Questo ora dovrebbe essere mappato correttamente
                'note': f"Ruolo MySQL: {mysql_ruolo}",  # Memorizzare il ruolo originale nelle note
                'stato_validazione': 'validato'  # Usare un valore valido dell'enum
            }
            
            # Se non abbiamo mappatura, saltare questo record
            if not ruolo_id:
                skipped_count += 1
                continue
            
            batch_data.append(record)
        
        print(f"Record da inserire: {len(batch_data)}")
        print(f"Record saltati (mancano mappature): {skipped_count}")
        
        # Inserire in batch
        batch_size = 100
        total_inserted = 0
        
        for i in range(0, len(batch_data), batch_size):
            batch = batch_data[i:i + batch_size]
            
            try:
                response = requests.post(
                    f"{supabase_url}/partecipazioni",
                    headers=headers,
                    json=batch
                )
                
                if response.status_code in [200, 201]:
                    total_inserted += len(batch)
                    print(f"Inserito batch {i//batch_size + 1}: {len(batch)} record (totale: {total_inserted})")
                else:
                    print(f"Errore batch {i//batch_size + 1}: {response.status_code} - {response.text}")
                    
            except Exception as e:
                print(f"Errore inserimento batch {i//batch_size + 1}: {e}")
        
        return total_inserted
        
    except Exception as e:
        print(f"Errore migrazione partecipazioni: {e}")
        return 0

def verify_partecipazioni():
    """Verificare le partecipazioni migrate"""
    try:
        # Contare le partecipazioni
        response = requests.head(
            f"{supabase_url}/partecipazioni",
            headers={**headers, "Prefer": "count=exact"}
        )
        
        if response.status_code in [200, 206]:
            count_header = response.headers.get('content-range', '')
            if count_header:
                total_count = count_header.split('/')[-1]
                print(f"\nTotale partecipazioni in Supabase: {total_count}")
        
        # Ottenere alcuni esempi
        response = requests.get(
            f"{supabase_url}/partecipazioni",
            headers=headers,
            params={
                "select": "id,artista_id,opera_id,ruolo_id,artisti(nome,cognome),opere(titolo),ruoli(nome)",
                "limit": 5
            }
        )
        
        if response.status_code == 200:
            examples = response.json()
            print("\nEsempi di partecipazioni migrate:")
            for ex in examples:
                artista = ex.get('artisti', {})
                opera = ex.get('opere', {})
                ruolo = ex.get('ruoli', {})
                
                artista_nome = f"{artista.get('nome', '')} {artista.get('cognome', '')}"
                opera_titolo = opera.get('titolo', 'N/A')
                ruolo_nome = ruolo.get('nome', 'N/A')
                
                print(f"  {artista_nome} in '{opera_titolo}' come {ruolo_nome}")
        
        return True
        
    except Exception as e:
        print(f"Errore verifica: {e}")
        return False

if __name__ == "__main__":
    print("Migrazione partecipazioni da MySQL a Supabase...\n")
    
    # Step 1: Verificare tabella ruoli
    ruoli_supabase = check_ruoli_table()
    if not ruoli_supabase:
        print("⚠ Senza tabella ruoli, procederemo senza ruolo_id")
        ruoli_supabase = []
    
    # Step 2: Creare mappature ID
    artisti_map, opere_map = create_id_mappings()
    if not artisti_map or not opere_map:
        print("✗ Impossibile creare mappature ID")
        exit(1)
    
    # Step 3: Creare mappatura ruoli
    ruolo_map = create_ruolo_mapping(ruoli_supabase)
    print(f"Mappatura ruoli: {ruolo_map}")
    
    # Step 4: Estrarre partecipazioni da MySQL
    partecipazioni = extract_partecipazioni()
    if not partecipazioni:
        print("✗ Nessuna partecipazione trovata")
        exit(1)
    
    # Step 5: Migrare partecipazioni
    migrated_count = migrate_partecipazioni(partecipazioni, artisti_map, opere_map, ruolo_map)
    
    # Step 6: Verificare risultati
    if migrated_count > 0:
        verify_partecipazioni()
        print(f"\n✓ Migrazione completata! {migrated_count} partecipazioni migrate.")
    else:
        print("\n✗ Migrazione fallita")