#!/usr/bin/env python3
import requests
import json
from datetime import datetime

# Supabase PostgreSQL connection details
supabase_url = "https://jdflzupcfwdcajxfobfj.supabase.co/rest/v1"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZmx6dXBjZndkY2FqeGZvYmZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDg2MTUxOCwiZXhwIjoyMDY2NDM3NTE4fQ.Tu03Gs9pvYAnr7qqTsFHqG38O7vGGGn0xTqwIvv2UFo"

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
    "Prefer": "count=exact"
}

class SupabaseQuery:
    def __init__(self):
        self.url = supabase_url
        self.headers = headers
    
    def execute(self, table, params=None):
        """Esegue una query su una tabella"""
        if params is None:
            params = {}
        
        try:
            response = requests.get(
                f"{self.url}/{table}",
                headers=self.headers,
                params=params
            )
            
            if response.status_code in [200, 206]:  # 206 = Partial Content
                return response.json()
            else:
                print(f"Errore {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print(f"Errore nella connessione: {e}")
            return None
    
    def insert(self, table, data):
        """Inserisce dati in una tabella"""
        try:
            response = requests.post(
                f"{self.url}/{table}",
                headers=self.headers,
                json=data
            )
            
            if response.status_code in [200, 201]:
                return response.json()
            else:
                print(f"Errore inserimento {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print(f"Errore nell'inserimento: {e}")
            return None
    
    def update(self, table, data, filters):
        """Aggiorna dati in una tabella"""
        try:
            # Costruisci i parametri di filtro
            params = {}
            for key, value in filters.items():
                params[f"{key}"] = f"eq.{value}"
            
            response = requests.patch(
                f"{self.url}/{table}",
                headers=self.headers,
                json=data,
                params=params
            )
            
            if response.status_code in [200, 204]:
                return response.json() if response.content else True
            else:
                print(f"Errore aggiornamento {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print(f"Errore nell'aggiornamento: {e}")
            return None
    
    def delete(self, table, filters):
        """Elimina dati da una tabella"""
        try:
            # Costruisci i parametri di filtro
            params = {}
            for key, value in filters.items():
                params[f"{key}"] = f"eq.{value}"
            
            response = requests.delete(
                f"{self.url}/{table}",
                headers=self.headers,
                params=params
            )
            
            if response.status_code in [200, 204]:
                return True
            else:
                print(f"Errore eliminazione {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print(f"Errore nell'eliminazione: {e}")
            return None

def demo_queries():
    """Dimostra varie tipologie di query"""
    db = SupabaseQuery()
    
    print("🔍 DEMO QUERY SUPABASE POSTGRESQL")
    print("=" * 50)
    
    # 1. Query semplici
    print("\n1. 📊 STATISTICHE GENERALI")
    print("-" * 30)
    
    # Conta artisti
    artisti = db.execute("artisti", {"select": "id", "limit": 1})
    print(f"✅ Artisti nel database: {len(artisti) if artisti else 0}")
    
    # Conta opere
    opere = db.execute("opere", {"select": "id", "limit": 1})
    print(f"✅ Opere nel database: {len(opere) if opere else 0}")
    
    # Conta partecipazioni
    partecipazioni = db.execute("partecipazioni", {"select": "id", "limit": 1})
    print(f"✅ Partecipazioni nel database: {len(partecipazioni) if partecipazioni else 0}")
    
    # 2. Query con filtri
    print("\n2. 🎬 OPERE PER TIPO")
    print("-" * 30)
    
    # Film
    film = db.execute("opere", {
        "tipo": "eq.film",
        "select": "titolo,anno_produzione,regista",
        "limit": 5
    })
    if film:
        print("📽️ Film:")
        for f in film:
            regista = f.get('regista', ['N/A'])[0] if f.get('regista') else 'N/A'
            print(f"  - {f.get('titolo')} ({f.get('anno_produzione')}) - Regista: {regista}")
    
    # Serie TV
    serie = db.execute("opere", {
        "tipo": "eq.serie_tv",
        "select": "titolo,anno_produzione,dettagli_serie",
        "limit": 5
    })
    if serie:
        print("\n📺 Serie TV:")
        for s in serie:
            dettagli = s.get('dettagli_serie', {})
            if isinstance(dettagli, dict):
                stagioni = dettagli.get('numero_stagioni', 'N/A')
            else:
                stagioni = 'N/A'
            print(f"  - {s.get('titolo')} ({s.get('anno_produzione')}) - Stagioni: {stagioni}")
    
    # 3. Query con join (simulate con multiple chiamate)
    print("\n3. 🎭 PARTECIPAZIONI CON DETTAGLI")
    print("-" * 30)
    
    partecipazioni_dettagli = db.execute("partecipazioni", {
        "select": "personaggio,opera_id,artista_id,ruolo_id",
        "limit": 5
    })
    
    if partecipazioni_dettagli:
        for p in partecipazioni_dettagli:
            # Ottieni dettagli opera
            opera = db.execute("opere", {
                "id": f"eq.{p.get('opera_id')}",
                "select": "titolo,tipo"
            })
            
            # Ottieni dettagli artista
            artista = db.execute("artisti", {
                "id": f"eq.{p.get('artista_id')}",
                "select": "nome,cognome"
            })
            
            opera_titolo = opera[0].get('titolo') if opera else 'N/A'
            artista_nome = f"{artista[0].get('nome')} {artista[0].get('cognome')}" if artista else 'N/A'
            
            print(f"  - {artista_nome} → {opera_titolo} (personaggio: {p.get('personaggio')})")
    
    # 4. Query con ordinamento e limiti
    print("\n4. 📈 OPERE PIÙ RECENTI")
    print("-" * 30)
    
    opere_recenti = db.execute("opere", {
        "select": "titolo,anno_produzione,tipo",
        "order": "anno_produzione.desc",
        "limit": 5
    })
    
    if opere_recenti:
        for o in opere_recenti:
            print(f"  - {o.get('titolo')} ({o.get('anno_produzione')}) - {o.get('tipo')}")
    
    # 5. Query con ricerca testuale
    print("\n5. 🔍 RICERCA PER PAROLE CHIAVE")
    print("-" * 30)
    
    # Cerca opere che contengono "bellezza"
    ricerca = db.execute("opere", {
        "titolo": "ilike.*bellezza*",
        "select": "titolo,anno_produzione",
        "limit": 3
    })
    
    if ricerca:
        print("Opere che contengono 'bellezza':")
        for r in ricerca:
            print(f"  - {r.get('titolo')} ({r.get('anno_produzione')})")

def demo_crud_operations():
    """Dimostra operazioni CRUD"""
    db = SupabaseQuery()
    
    print("\n6. 🔧 OPERAZIONI CRUD")
    print("-" * 30)
    
    # Esempio di inserimento (commentato per sicurezza)
    print("📝 Esempio di inserimento (commentato):")
    print("""
    nuovo_artista = {
        "nome": "Mario",
        "cognome": "Rossi",
        "territorio": "IT",
        "stato": "attivo"
    }
    # risultato = db.insert("artisti", nuovo_artista)
    """)
    
    # Esempio di aggiornamento (commentato per sicurezza)
    print("✏️ Esempio di aggiornamento (commentato):")
    print("""
    # db.update("artisti", {"stato": "inattivo"}, {"nome": "Mario"})
    """)
    
    # Esempio di eliminazione (commentato per sicurezza)
    print("🗑️ Esempio di eliminazione (commentato):")
    print("""
    # db.delete("artisti", {"nome": "Mario"})
    """)

if __name__ == "__main__":
    demo_queries()
    demo_crud_operations()
    
    print("\n" + "=" * 50)
    print("✅ DEMO COMPLETATA!")
    print("\n💡 Puoi utilizzare questo script come base per:")
    print("   - Query complesse con filtri multipli")
    print("   - Operazioni CRUD complete")
    print("   - Analisi dei dati")
    print("   - Report personalizzati")
    print("\n🔗 Per query SQL dirette, usa Supabase Studio su:")
    print("   http://localhost:54323 (se Supabase è avviato localmente)")
    print("   oppure il dashboard web di Supabase")
