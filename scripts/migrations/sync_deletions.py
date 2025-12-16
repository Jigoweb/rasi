#!/usr/bin/env python3
"""
Script per sincronizzare le eliminazioni da MySQL a PostgreSQL (Supabase).
Elimina le partecipazioni in PostgreSQL il cui id_opera_staging non esiste più in MySQL.
"""

import mysql.connector
import requests
import json
import time

# MySQL connection details (da migrate_partecipazioni.py)
mysql_config = {
    'host': '86.105.14.112',
    'port': 3306,
    'user': 'pgloader',
    'password': 'Pgloader1234',
    'database': 'banca_dati_rasi'
}

# Supabase configuration
SUPABASE_URL = "https://jdflzupcfwdcajxfobfj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZmx6dXBjZndkY2FqeGZvYmZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDg2MTUxOCwiZXhwIjoyMDY2NDM3NTE4fQ.Tu03Gs9pvYAnr7qqTsFHqG38O7vGGGn0xTqwIvv2UFo"

supabase_headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}


def get_mysql_opera_ids():
    """
    Estrae tutti gli ID delle opere da MySQL (tabella opere).
    """
    print("📥 Connessione a MySQL e estrazione ID opere...")
    
    try:
        conn = mysql.connector.connect(**mysql_config)
        cursor = conn.cursor()
        
        # Estrarre tutti gli id_opera dalla tabella Opere (con O maiuscola)
        cursor.execute("SELECT id_opera FROM Opere ORDER BY id_opera")
        
        mysql_ids = set()
        for (id_opera,) in cursor:
            mysql_ids.add(id_opera)
        
        cursor.close()
        conn.close()
        
        print(f"✅ Estratti {len(mysql_ids)} ID da MySQL")
        print(f"   Range: {min(mysql_ids)} - {max(mysql_ids)}")
        
        return mysql_ids
        
    except Exception as e:
        print(f"❌ Errore connessione MySQL: {e}")
        return set()


def get_postgresql_staging_ids():
    """
    Estrae tutti gli id_opera_staging dalle partecipazioni in PostgreSQL.
    """
    print("📥 Estrazione staging IDs da PostgreSQL...")
    
    all_ids = set()
    offset = 0
    limit = 1000
    
    while True:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/partecipazioni",
            headers={
                **supabase_headers, 
                "Range": f"{offset}-{offset+limit-1}",
                "Prefer": "count=exact"
            },
            params={
                "select": "id,metadati",
            }
        )
        
        if response.status_code not in [200, 206]:
            print(f"   Errore: {response.status_code} - {response.text}")
            break
        
        data = response.json()
        if not data:
            break
        
        for record in data:
            metadati = record.get('metadati', {})
            if metadati and 'id_opera_staging' in metadati:
                staging_id = int(metadati['id_opera_staging'])
                all_ids.add(staging_id)
        
        print(f"   Caricati {len(all_ids)} IDs unici... (offset: {offset})")
        offset += limit
        
        if len(data) < limit:
            break
    
    print(f"✅ Trovati {len(all_ids)} staging IDs unici in PostgreSQL")
    if all_ids:
        print(f"   Range: {min(all_ids)} - {max(all_ids)}")
    
    return all_ids


def get_partecipazioni_to_delete(staging_ids_to_remove):
    """
    Recupera gli ID delle partecipazioni da eliminare.
    """
    print(f"🔍 Cercando partecipazioni con staging IDs da eliminare...")
    
    partecipazioni_ids = []
    
    for staging_id in staging_ids_to_remove:
        # Nota: Supabase non supporta direttamente query su JSONB con operatori complessi via REST
        # Dobbiamo fare una query per ogni staging_id o usare RPC
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/partecipazioni",
            headers=supabase_headers,
            params={
                "select": "id",
                "metadati->>id_opera_staging": f"eq.{staging_id}"
            }
        )
        
        if response.status_code == 200:
            records = response.json()
            for record in records:
                partecipazioni_ids.append(record['id'])
        
    return partecipazioni_ids


def delete_individuazioni_for_partecipazioni(partecipazione_ids):
    """
    Elimina le individuazioni collegate alle partecipazioni da eliminare.
    """
    if not partecipazione_ids:
        return 0
    
    print(f"🔍 Cercando individuazioni collegate alle {len(partecipazione_ids)} partecipazioni...")
    
    # Trova le individuazioni collegate
    individuazioni_to_delete = []
    
    for part_id in partecipazione_ids:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/individuazioni",
            headers=supabase_headers,
            params={
                "select": "id",
                "partecipazione_id": f"eq.{part_id}"
            }
        )
        
        if response.status_code == 200:
            records = response.json()
            for record in records:
                individuazioni_to_delete.append(record['id'])
    
    if not individuazioni_to_delete:
        print("   ✅ Nessuna individuazione collegata")
        return 0
    
    print(f"   🗑️  Eliminando {len(individuazioni_to_delete)} individuazioni collegate...")
    
    # Elimina le individuazioni
    total_deleted = 0
    batch_size = 50
    
    for i in range(0, len(individuazioni_to_delete), batch_size):
        batch = individuazioni_to_delete[i:i+batch_size]
        ids_str = ",".join(batch)
        
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/individuazioni",
            headers={**supabase_headers, "Prefer": "return=representation"},
            params={
                "id": f"in.({ids_str})"
            }
        )
        
        if response.status_code in [200, 204]:
            deleted = len(response.json()) if response.text else len(batch)
            total_deleted += deleted
        else:
            print(f"   ❌ Errore eliminazione individuazioni: {response.status_code} - {response.text}")
        
        time.sleep(0.1)
    
    print(f"   ✅ Eliminate {total_deleted} individuazioni")
    return total_deleted


def delete_partecipazioni_batch(partecipazione_ids):
    """
    Elimina le partecipazioni per ID in batch.
    """
    if not partecipazione_ids:
        print("✅ Nessuna partecipazione da eliminare")
        return 0
    
    print(f"🗑️  Eliminando {len(partecipazione_ids)} partecipazioni...")
    
    total_deleted = 0
    batch_size = 50
    
    for i in range(0, len(partecipazione_ids), batch_size):
        batch = partecipazione_ids[i:i+batch_size]
        
        # Creare la lista di ID per il filtro
        ids_str = ",".join(batch)
        
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/partecipazioni",
            headers={**supabase_headers, "Prefer": "return=representation"},
            params={
                "id": f"in.({ids_str})"
            }
        )
        
        if response.status_code in [200, 204]:
            deleted = len(response.json()) if response.text else len(batch)
            total_deleted += deleted
            print(f"   ✅ Eliminati {total_deleted}/{len(partecipazione_ids)}...")
        else:
            print(f"   ❌ Errore batch: {response.status_code} - {response.text}")
        
        time.sleep(0.1)  # Rate limiting
    
    return total_deleted


def main():
    print("=" * 70)
    print("Sincronizzazione Eliminazioni MySQL -> PostgreSQL (Partecipazioni)")
    print("=" * 70)
    print()
    
    # Step 1: Ottenere gli ID da MySQL
    mysql_ids = get_mysql_opera_ids()
    if not mysql_ids:
        print("❌ Impossibile ottenere ID da MySQL")
        return
    
    print()
    
    # Step 2: Ottenere gli staging IDs da PostgreSQL
    pg_staging_ids = get_postgresql_staging_ids()
    if not pg_staging_ids:
        print("❌ Impossibile ottenere staging IDs da PostgreSQL")
        return
    
    print()
    
    # Step 3: Trovare gli IDs da eliminare (presenti in PG ma non in MySQL)
    # IMPORTANTE: Consideriamo solo gli ID fino al max di staging (34075)
    # perché quelli oltre non erano stati migrati
    max_staging_id = max(pg_staging_ids)
    mysql_ids_filtered = {id for id in mysql_ids if id <= max_staging_id}
    
    ids_to_remove = pg_staging_ids - mysql_ids_filtered
    
    print(f"📊 Analisi:")
    print(f"   - ID MySQL (fino a {max_staging_id}): {len(mysql_ids_filtered)}")
    print(f"   - Staging IDs in PostgreSQL: {len(pg_staging_ids)}")
    print(f"   - IDs da ELIMINARE: {len(ids_to_remove)}")
    
    if ids_to_remove:
        print(f"\n   Primi 20 ID da eliminare: {sorted(list(ids_to_remove))[:20]}")
    
    print()
    
    # Step 4: Conferma utente
    if not ids_to_remove:
        print("✅ Nessuna eliminazione necessaria - i database sono sincronizzati!")
        return
    
    print(f"⚠️  ATTENZIONE: Verranno eliminate le partecipazioni con i seguenti staging IDs:")
    print(f"   Totale: {len(ids_to_remove)} staging IDs")
    
    confirm = input("\n🔴 Procedere con l'eliminazione? (digita 'SI' per confermare): ")
    
    if confirm.strip().upper() != 'SI':
        print("\n❌ Operazione annullata")
        return
    
    print()
    
    # Step 5: Trovare le partecipazioni da eliminare
    partecipazioni_ids = get_partecipazioni_to_delete(ids_to_remove)
    print(f"\n📋 Trovate {len(partecipazioni_ids)} partecipazioni da eliminare")
    
    if not partecipazioni_ids:
        print("✅ Nessuna partecipazione trovata con questi staging IDs")
        return
    
    # Step 5.5: Prima eliminare le individuazioni collegate (per rispettare i vincoli FK)
    print()
    individuazioni_deleted = delete_individuazioni_for_partecipazioni(partecipazioni_ids)
    
    # Step 6: Eliminare le partecipazioni
    print()
    deleted_count = delete_partecipazioni_batch(partecipazioni_ids)
    
    print()
    print("=" * 70)
    print(f"✅ Sincronizzazione completata!")
    print(f"   - Individuazioni eliminate: {individuazioni_deleted}")
    print(f"   - Partecipazioni eliminate: {deleted_count}")
    print("=" * 70)


def dry_run():
    """
    Esegue un'analisi senza eliminare nulla.
    """
    print("=" * 70)
    print("DRY RUN - Analisi Sincronizzazione (nessuna modifica)")
    print("=" * 70)
    print()
    
    # Step 1: Ottenere gli ID da MySQL
    mysql_ids = get_mysql_opera_ids()
    if not mysql_ids:
        print("❌ Impossibile ottenere ID da MySQL")
        return
    
    print()
    
    # Step 2: Ottenere gli staging IDs da PostgreSQL
    pg_staging_ids = get_postgresql_staging_ids()
    if not pg_staging_ids:
        print("❌ Impossibile ottenere staging IDs da PostgreSQL")
        return
    
    print()
    
    # Step 3: Analisi
    max_staging_id = max(pg_staging_ids)
    mysql_ids_filtered = {id for id in mysql_ids if id <= max_staging_id}
    
    ids_to_remove = pg_staging_ids - mysql_ids_filtered
    ids_missing_in_pg = mysql_ids_filtered - pg_staging_ids
    
    print("📊 RIEPILOGO ANALISI:")
    print(f"   - Max staging ID in PostgreSQL: {max_staging_id}")
    print(f"   - ID MySQL totali: {len(mysql_ids)}")
    print(f"   - ID MySQL (fino a {max_staging_id}): {len(mysql_ids_filtered)}")
    print(f"   - Staging IDs in PostgreSQL: {len(pg_staging_ids)}")
    print()
    print(f"   🔴 IDs da ELIMINARE da PostgreSQL: {len(ids_to_remove)}")
    print(f"   🟡 IDs presenti in MySQL ma non in PG: {len(ids_missing_in_pg)}")
    
    if ids_to_remove:
        print(f"\n   Esempio IDs da eliminare (primi 30):")
        for id in sorted(list(ids_to_remove))[:30]:
            print(f"      - {id}")
    
    print()
    print("=" * 70)
    print("Per eseguire l'eliminazione effettiva, eseguire: python sync_deletions.py --execute")
    print("=" * 70)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--execute':
        main()
    else:
        dry_run()
