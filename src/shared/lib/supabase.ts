// Re-export supabase client for convenience
export { supabase } from './supabase-client'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      artisti: {
        Row: {
          codice_fiscale: string | null
          codice_ipn: string | null
          codice_paese: string | null
          codici_esterni: Json | null
          cognome: string
          componente_stabile_gruppo_orchestra: string | null
          contatti: Json | null
          created_at: string | null
          created_by: string | null
          data_inizio_mandato: string
          data_nascita: string | null
          diritti_attivi: Json | null
          forma_giuridica: string | null
          id: string
          imdb_nconst: string | null
          indirizzo: Json | null
          is_rasi: boolean
          luogo_nascita: string | null
          nome: string
          nome_arte: string | null
          partita_iva: number | null
          ragione_sociale: string | null
          search_vector: unknown
          stato: Database["public"]["Enums"]["stato_iscrizione"] | null
          territorio: Database["public"]["Enums"]["territorio_enum"] | null
          tipologia: Database["public"]["Enums"]["tipologia_enum"] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          codice_fiscale?: string | null
          codice_ipn?: string | null
          codice_paese?: string | null
          codici_esterni?: Json | null
          cognome: string
          componente_stabile_gruppo_orchestra?: string | null
          contatti?: Json | null
          created_at?: string | null
          created_by?: string | null
          data_inizio_mandato?: string
          data_nascita?: string | null
          diritti_attivi?: Json | null
          forma_giuridica?: string | null
          id?: string
          imdb_nconst?: string | null
          indirizzo?: Json | null
          is_rasi?: boolean
          luogo_nascita?: string | null
          nome: string
          nome_arte?: string | null
          partita_iva?: number | null
          ragione_sociale?: string | null
          search_vector?: unknown
          stato?: Database["public"]["Enums"]["stato_iscrizione"] | null
          territorio?: Database["public"]["Enums"]["territorio_enum"] | null
          tipologia?: Database["public"]["Enums"]["tipologia_enum"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          codice_fiscale?: string | null
          codice_ipn?: string | null
          codice_paese?: string | null
          codici_esterni?: Json | null
          cognome?: string
          componente_stabile_gruppo_orchestra?: string | null
          contatti?: Json | null
          created_at?: string | null
          created_by?: string | null
          data_inizio_mandato?: string
          data_nascita?: string | null
          diritti_attivi?: Json | null
          forma_giuridica?: string | null
          id?: string
          imdb_nconst?: string | null
          indirizzo?: Json | null
          is_rasi?: boolean
          luogo_nascita?: string | null
          nome?: string
          nome_arte?: string | null
          partita_iva?: number | null
          ragione_sociale?: string | null
          search_vector?: unknown
          stato?: Database["public"]["Enums"]["stato_iscrizione"] | null
          territorio?: Database["public"]["Enums"]["territorio_enum"] | null
          tipologia?: Database["public"]["Enums"]["tipologia_enum"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      campagne_individuazione: {
        Row: {
          anno: number
          campagne_programmazione_id: string
          configurazione_matching: Json
          created_at: string | null
          created_by: string | null
          descrizione: string | null
          emittente_id: string
          id: string
          nome: string
          statistiche: Json | null
          stato: Database["public"]["Enums"]["stato_campagna"] | null
          updated_at: string | null
        }
        Insert: {
          anno: number
          campagne_programmazione_id: string
          configurazione_matching?: Json
          created_at?: string | null
          created_by?: string | null
          descrizione?: string | null
          emittente_id: string
          id?: string
          nome: string
          statistiche?: Json | null
          stato?: Database["public"]["Enums"]["stato_campagna"] | null
          updated_at?: string | null
        }
        Update: {
          anno?: number
          campagne_programmazione_id?: string
          configurazione_matching?: Json
          created_at?: string | null
          created_by?: string | null
          descrizione?: string | null
          emittente_id?: string
          id?: string
          nome?: string
          statistiche?: Json | null
          stato?: Database["public"]["Enums"]["stato_campagna"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campagne_individuazione_campagne_programmazione_id_fkey"
            columns: ["campagne_programmazione_id"]
            isOneToOne: false
            referencedRelation: "campagne_programmazione"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagne_individuazione_emittente_id_fkey"
            columns: ["emittente_id"]
            isOneToOne: false
            referencedRelation: "emittenti"
            referencedColumns: ["id"]
          },
        ]
      }
      campagne_programmazione: {
        Row: {
          anno: number
          configurazione_calcolo: Json
          configurazione_programmazione: Json
          created_at: string | null
          created_by: string | null
          data_fine: string | null
          data_inizio: string | null
          descrizione: string | null
          emittente_id: string
          id: string
          importo_totale_disponibile: number | null
          is_individuated: boolean
          nome: string
          periodo_riferimento_fine: string | null
          periodo_riferimento_inizio: string | null
          processing_by: string | null
          processing_started_at: string | null
          statistiche: Json | null
          stato: Database["public"]["Enums"]["stato_campagna"] | null
          updated_at: string | null
        }
        Insert: {
          anno: number
          configurazione_calcolo?: Json
          configurazione_programmazione?: Json
          created_at?: string | null
          created_by?: string | null
          data_fine?: string | null
          data_inizio?: string | null
          descrizione?: string | null
          emittente_id: string
          id?: string
          importo_totale_disponibile?: number | null
          is_individuated?: boolean
          nome: string
          periodo_riferimento_fine?: string | null
          periodo_riferimento_inizio?: string | null
          processing_by?: string | null
          processing_started_at?: string | null
          statistiche?: Json | null
          stato?: Database["public"]["Enums"]["stato_campagna"] | null
          updated_at?: string | null
        }
        Update: {
          anno?: number
          configurazione_calcolo?: Json
          configurazione_programmazione?: Json
          created_at?: string | null
          created_by?: string | null
          data_fine?: string | null
          data_inizio?: string | null
          descrizione?: string | null
          emittente_id?: string
          id?: string
          importo_totale_disponibile?: number | null
          is_individuated?: boolean
          nome?: string
          periodo_riferimento_inizio?: string | null
          periodo_riferimento_fine?: string | null
          processing_by?: string | null
          processing_started_at?: string | null
          statistiche?: Json | null
          stato?: Database["public"]["Enums"]["stato_campagna"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campagne_programmazione_emittente_id_fkey"
            columns: ["emittente_id"]
            isOneToOne: false
            referencedRelation: "emittenti"
            referencedColumns: ["id"]
          },
        ]
      }
      campagne_ripartizione: {
        Row: {
          configurazione_calcolo: Json
          created_at: string | null
          created_by: string | null
          data_approvazione: string | null
          data_calcolo: string | null
          data_distribuzione: string | null
          descrizione: string | null
          id: string
          importo_totale_disponibile: number
          nome: string
          periodo_riferimento_fine: string
          periodo_riferimento_inizio: string
          statistiche_calcolo: Json | null
          stato: Database["public"]["Enums"]["stato_ripartizione"] | null
          updated_at: string | null
        }
        Insert: {
          configurazione_calcolo?: Json
          created_at?: string | null
          created_by?: string | null
          data_approvazione?: string | null
          data_calcolo?: Json
          data_distribuzione?: string | null
          descrizione?: string | null
          id?: string
          importo_totale_disponibile: number
          nome: string
          periodo_riferimento_fine: string
          periodo_riferimento_inizio: string
          statistiche_calcolo?: Json | null
          stato?: Database["public"]["Enums"]["stato_ripartizione"] | null
          updated_at?: string | null
        }
        Update: {
          configurazione_calcolo?: Json
          created_at?: string | null
          created_by?: string | null
          data_approvazione?: string | null
          data_calcolo?: Json
          data_distribuzione?: string | null
          descrizione?: string | null
          id?: string
          importo_totale_disponibile?: number
          nome?: string
          periodo_riferimento_fine?: string
          periodo_riferimento_inizio?: string
          statistiche_calcolo?: Json | null
          stato?: Database["public"]["Enums"]["stato_ripartizione"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      emittenti: {
        Row: {
          attiva: boolean | null
          codice: string
          configurazione: Json
          contatti: Json | null
          created_at: string | null
          id: string
          metadati: Json | null
          nome: string
          paese: string | null
          tipo: Database["public"]["Enums"]["tipo_emittente"]
          updated_at: string | null
        }
        Insert: {
          attiva?: boolean | null
          codice: string
          configurazione?: Json
          contatti?: Json | null
          created_at?: string | null
          id?: string
          metadati?: Json | null
          nome: string
          paese?: string | null
          tipo: Database["public"]["Enums"]["tipo_emittente"]
          updated_at?: string | null
        }
        Update: {
          attiva?: boolean | null
          codice?: string
          configurazione?: Json
          contatti?: Json | null
          created_at?: string | null
          id?: string
          metadati?: Json | null
          nome?: string
          paese?: string | null
          tipo?: Database["public"]["Enums"]["tipo_emittente"]
          updated_at?: string | null
        }
        Relationships: []
      }
      episodi: {
        Row: {
          codice_isan: string | null
          created_at: string | null
          data_prima_messa_in_onda: string | null
          descrizione: string | null
          durata_minuti: number | null
          id: string
          imdb_tconst: string | null
          metadati: Json | null
          numero_episodio: number
          numero_stagione: number
          opera_id: string
          titolo_episodio: string | null
        }
        Insert: {
          codice_isan?: string | null
          created_at?: string | null
          data_prima_messa_in_onda?: string | null
          descrizione?: string | null
          durata_minuti?: number | null
          id?: string
          imdb_tconst?: string | null
          metadati?: Json | null
          numero_episodio: number
          numero_stagione: number
          opera_id: string
          titolo_episodio?: string | null
        }
        Update: {
          codice_isan?: string | null
          created_at?: string | null
          data_prima_messa_in_onda?: string | null
          descrizione?: string | null
          durata_minuti?: number | null
          id?: string
          imdb_tconst?: string | null
          metadati?: Json | null
          numero_episodio?: number
          numero_stagione?: number
          opera_id?: string
          titolo_episodio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episodi_opera_id_fkey"
            columns: ["opera_id"]
            isOneToOne: false
            referencedRelation: "opere"
            referencedColumns: ["id"]
          },
        ]
      }
      individuazioni: {
        Row: {
          anno: number | null
          artista_id: string
          campagna_individuazioni_id: string
          canale: string | null
          created_at: string | null
          data_fine: string | null
          data_inizio: string | null
          data_trasmissione: string | null
          descrizione: string | null
          dettagli_matching: Json
          durata_minuti: number | null
          emittente: string | null
          emittente_id: string
          episodio_id: string | null
          errori_processamento: string[] | null
          fascia_oraria: Database["public"]["Enums"]["fascia_oraria"] | null
          id: string
          metadati: Json | null
          metadati_trasmissione: Json | null
          metodo: Database["public"]["Enums"]["metodo_matching"] | null
          note_validazione: string | null
          numero_episodio: number | null
          numero_stagione: number | null
          opera_id: string
          ora_fine: string | null
          ora_inizio: string | null
          partecipazione_id: string
          processato: boolean | null
          processato_il: string | null
          production: string | null
          programmazione_id: string
          punteggio_matching: number
          regia: string | null
          retail_price: number | null
          ruolo_id: string
          sales_month: number | null
          search_vector: unknown
          stato: Database["public"]["Enums"]["stato_individuazione"] | null
          tipo: string | null
          tipo_trasmissione:
            | Database["public"]["Enums"]["tipo_trasmissione"]
            | null
          titolo: string | null
          titolo_episodio: string | null
          titolo_episodio_originale: string | null
          titolo_originale: string | null
          total_net_ad_revenue: number | null
          total_revenue: number | null
          track_price_local_currency: number | null
          validato_da: string | null
          validato_il: string | null
          views: number | null
        }
        Insert: {
          anno?: number | null
          artista_id: string
          campagna_individuazioni_id: string
          canale?: string | null
          created_at?: string | null
          data_fine?: string | null
          data_inizio?: string | null
          data_trasmissione?: string | null
          descrizione?: string | null
          dettagli_matching: Json
          durata_minuti?: number | null
          emittente?: string | null
          emittente_id: string
          episodio_id?: string | null
          errori_processamento?: string[] | null
          fascia_oraria?: Database["public"]["Enums"]["fascia_oraria"] | null
          id?: string
          metadati?: Json | null
          metadati_trasmissione?: Json | null
          metodo?: Database["public"]["Enums"]["metodo_matching"] | null
          note_validazione?: string | null
          numero_episodio?: number | null
          numero_stagione?: number | null
          opera_id: string
          ora_fine?: string | null
          ora_inizio?: string | null
          partecipazione_id: string
          processato?: boolean | null
          processato_il?: string | null
          production?: string | null
          programmazione_id: string
          punteggio_matching: number
          regia?: string | null
          retail_price?: number | null
          ruolo_id: string
          sales_month?: number | null
          search_vector?: unknown
          stato?: Database["public"]["Enums"]["stato_individuazione"] | null
          tipo?: string | null
          tipo_trasmissione?:
            | Database["public"]["Enums"]["tipo_trasmissione"]
            | null
          titolo?: string | null
          titolo_episodio?: string | null
          titolo_episodio_originale?: string | null
          titolo_originale?: string | null
          total_net_ad_revenue?: number | null
          total_revenue?: number | null
          track_price_local_currency?: number | null
          validato_da?: string | null
          validato_il?: string | null
          views?: number | null
        }
        Update: {
          anno?: number | null
          artista_id?: string
          campagna_individuazioni_id?: string
          canale?: string | null
          created_at?: string | null
          data_fine?: string | null
          data_inizio?: string | null
          data_trasmissione?: string | null
          descrizione?: string | null
          dettagli_matching?: Json
          durata_minuti?: number | null
          emittente?: string | null
          emittente_id?: string
          episodio_id?: string | null
          errori_processamento?: string[] | null
          fascia_oraria?: Database["public"]["Enums"]["fascia_oraria"] | null
          id?: string
          metadati?: Json | null
          metadati_trasmissione?: Json | null
          metodo?: Database["public"]["Enums"]["metodo_matching"] | null
          note_validazione?: string | null
          numero_episodio?: number | null
          numero_stagione?: number | null
          opera_id?: string
          ora_fine?: string | null
          ora_inizio?: string | null
          partecipazione_id?: string
          processato?: boolean | null
          processato_il?: string | null
          production?: string | null
          programmazione_id?: string
          punteggio_matching?: number
          regia?: string | null
          retail_price?: number | null
          ruolo_id?: string
          sales_month?: number | null
          search_vector?: unknown
          stato?: Database["public"]["Enums"]["stato_individuazione"] | null
          tipo?: string | null
          tipo_trasmissione?:
            | Database["public"]["Enums"]["tipo_trasmissione"]
            | null
          titolo?: string | null
          titolo_episodio?: string | null
          titolo_episodio_originale?: string | null
          titolo_originale?: string | null
          total_net_ad_revenue?: number | null
          total_revenue?: number | null
          track_price_local_currency?: number | null
          validato_da?: string | null
          validato_il?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "individuazioni_artista_id_fkey"
            columns: ["artista_id"]
            isOneToOne: false
            referencedRelation: "artisti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuazioni_campagna_individuazioni_id_fkey"
            columns: ["campagna_individuazioni_id"]
            isOneToOne: false
            referencedRelation: "campagne_individuazione"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuazioni_emittente_id_fkey"
            columns: ["emittente_id"]
            isOneToOne: false
            referencedRelation: "emittenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuazioni_episodio_id_fkey"
            columns: ["episodio_id"]
            isOneToOne: false
            referencedRelation: "episodi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuazioni_opera_id_fkey"
            columns: ["opera_id"]
            isOneToOne: false
            referencedRelation: "opere"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuazioni_partecipazione_id_fkey"
            columns: ["partecipazione_id"]
            isOneToOne: false
            referencedRelation: "partecipazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuazioni_programmazione_id_fkey"
            columns: ["programmazione_id"]
            isOneToOne: false
            referencedRelation: "programmazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individuazioni_ruolo_id_fkey"
            columns: ["ruolo_id"]
            isOneToOne: false
            referencedRelation: "ruoli_tipologie"
            referencedColumns: ["id"]
          },
        ]
      }
      opere: {
        Row: {
          alias_titoli: string[] | null
          anno_produzione: number | null
          codice_isan: string | null
          codice_opera: string | null
          codici_esterni: Json | null
          created_at: string | null
          created_by: string | null
          dettagli_serie: Json | null
          id: string
          imdb_tconst: string | null
          metadati: Json | null
          regista: string[] | null
          search_vector: unknown
          tipo: Database["public"]["Enums"]["tipo_opera"]
          titolo: string
          titolo_originale: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          alias_titoli?: string[] | null
          anno_produzione?: number | null
          codice_isan?: string | null
          codice_opera?: string | null
          codici_esterni?: Json | null
          created_at?: string | null
          created_by?: string | null
          dettagli_serie?: Json | null
          id?: string
          imdb_tconst?: string | null
          metadati?: Json | null
          regista?: string[] | null
          search_vector?: unknown
          tipo: Database["public"]["Enums"]["tipo_opera"]
          titolo: string
          titolo_originale?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          alias_titoli?: string[] | null
          anno_produzione?: number | null
          codice_isan?: string | null
          codice_opera?: string | null
          codici_esterni?: Json | null
          created_at?: string | null
          created_by?: string | null
          dettagli_serie?: Json | null
          id?: string
          imdb_tconst?: string | null
          metadati?: Json | null
          regista?: string[] | null
          search_vector?: unknown
          tipo?: Database["public"]["Enums"]["tipo_opera"]
          titolo?: string
          titolo_originale?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      parametri_ripartizione: {
        Row: {
          categoria: string
          configurazione: Json
          created_at: string | null
          created_by: string | null
          descrizione: string | null
          id: string
          nome: string
          valido_al: string | null
          valido_dal: string
        }
        Insert: {
          categoria: string
          configurazione: Json
          created_at?: string | null
          created_by?: string | null
          descrizione?: string | null
          id?: string
          nome: string
          valido_al?: string | null
          valido_dal: string
        }
        Update: {
          categoria?: string
          configurazione?: Json
          created_at?: string | null
          created_by?: string | null
          descrizione?: string | null
          id?: string
          nome?: string
          valido_al?: string | null
          valido_dal?: string
        }
        Relationships: []
      }
      partecipazioni: {
        Row: {
          artista_id: string
          created_at: string | null
          created_by: string | null
          episodio_id: string | null
          id: string
          metadati: Json | null
          note: string | null
          note_validazione: string | null
          opera_id: string
          parametri_personalizzati: Json | null
          personaggio: string | null
          ruolo_id: string
          stato_validazione:
            | Database["public"]["Enums"]["stato_validazione"]
            | null
          updated_at: string | null
          updated_by: string | null
          validato_da: string | null
          validato_il: string | null
        }
        Insert: {
          artista_id: string
          created_at?: string | null
          created_by?: string | null
          episodio_id?: string | null
          id?: string
          metadati?: Json | null
          note?: string | null
          note_validazione?: string | null
          opera_id: string
          parametri_personalizzati?: Json | null
          personaggio?: string | null
          ruolo_id: string
          stato_validazione?:
            | Database["public"]["Enums"]["stato_validazione"]
            | null
          updated_at?: string | null
          updated_by?: string | null
          validato_da?: string | null
          validato_il?: string | null
        }
        Update: {
          artista_id?: string
          created_at?: string | null
          created_by?: string | null
          episodio_id?: string | null
          id?: string
          metadati?: Json | null
          note?: string | null
          note_validazione?: string | null
          opera_id?: string
          parametri_personalizzati?: Json | null
          personaggio?: string | null
          ruolo_id?: string
          stato_validazione?:
            | Database["public"]["Enums"]["stato_validazione"]
            | null
          updated_at?: string | null
          updated_by?: string | null
          validato_da?: string | null
          validato_il?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partecipazioni_artista_id_fkey"
            columns: ["artista_id"]
            isOneToOne: false
            referencedRelation: "artisti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partecipazioni_episodio_id_fkey"
            columns: ["episodio_id"]
            isOneToOne: false
            referencedRelation: "episodi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partecipazioni_opera_id_fkey"
            columns: ["opera_id"]
            isOneToOne: false
            referencedRelation: "opere"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partecipazioni_ruolo_id_fkey"
            columns: ["ruolo_id"]
            isOneToOne: false
            referencedRelation: "ruoli_tipologie"
            referencedColumns: ["id"]
          },
        ]
      }
      programmazioni: {
        Row: {
          anno: number | null
          campagna_programmazione_id: string | null
          canale: string | null
          created_at: string | null
          data_fine: string | null
          data_inizio: string | null
          data_trasmissione: string | null
          durata_minuti: number | null
          emittente: string | null
          emittente_id: string
          errori_processamento: string[] | null
          id: string
          metadati_trasmissione: Json | null
          numero_episodio: number | null
          numero_stagione: number | null
          ora_fine: string | null
          ora_inizio: string | null
          processato: boolean | null
          processato_il: string | null
          production: string | null
          regia: string | null
          retail_price: number | null
          sales_month: number | null
          search_vector: unknown
          tipo: string | null
          titolo: string | null
          titolo_episodio: string | null
          titolo_episodio_originale: string | null
          titolo_originale: string | null
          total_net_ad_revenue: number | null
          total_revenue: number | null
          track_price_local_currency: number | null
          views: number | null
        }
        Insert: {
          anno?: number | null
          campagna_programmazione_id?: string | null
          canale?: string | null
          created_at?: string | null
          data_fine?: string | null
          data_inizio?: string | null
          data_trasmissione?: string | null
          durata_minuti?: number | null
          emittente?: string | null
          emittente_id: string
          errori_processamento?: string[] | null
          id?: string
          metadati_trasmissione?: Json | null
          numero_episodio?: number | null
          numero_stagione?: number | null
          ora_fine?: string | null
          ora_inizio?: string | null
          processato?: boolean | null
          processato_il?: string | null
          production?: string | null
          regia?: string | null
          retail_price?: number | null
          sales_month?: number | null
          search_vector?: unknown
          tipo?: string | null
          titolo?: string | null
          titolo_episodio?: string | null
          titolo_episodio_originale?: string | null
          titolo_originale?: string | null
          total_net_ad_revenue?: number | null
          total_revenue?: number | null
          track_price_local_currency?: number | null
          views?: number | null
        }
        Update: {
          anno?: number | null
          campagna_programmazione_id?: string | null
          canale?: string | null
          created_at?: string | null
          data_fine?: string | null
          data_inizio?: string | null
          data_trasmissione?: string | null
          durata_minuti?: number | null
          emittente?: string | null
          emittente_id?: string
          errori_processamento?: string[] | null
          id?: string
          metadati_trasmissione?: Json | null
          numero_episodio?: number | null
          numero_stagione?: number | null
          ora_fine?: string | null
          ora_inizio?: string | null
          processato?: boolean | null
          processato_il?: string | null
          production?: string | null
          regia?: string | null
          retail_price?: number | null
          sales_month?: number | null
          search_vector?: unknown
          tipo?: string | null
          titolo?: string | null
          titolo_episodio?: string | null
          titolo_episodio_originale?: string | null
          titolo_originale?: string | null
          total_net_ad_revenue?: number | null
          total_revenue?: number | null
          track_price_local_currency?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programmazioni_campagna_programmazione_id_fkey"
            columns: ["campagna_programmazione_id"]
            isOneToOne: false
            referencedRelation: "campagne_programmazione"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmazioni_emittente_id_fkey"
            columns: ["emittente_id"]
            isOneToOne: false
            referencedRelation: "emittenti"
            referencedColumns: ["id"]
          },
        ]
      }
      ripartizioni: {
        Row: {
          altre_trattenute: number | null
          artista_id: string
          calcoli: Json
          campagna_ripartizione_id: string
          created_at: string | null
          id: string
          importo_lordo: number
          importo_netto: number
          numero_individuazioni: number
          storico_calcoli: Json | null
          trattenuta_collecting: number
          updated_at: string | null
        }
        Insert: {
          altre_trattenute?: number | null
          artista_id: string
          calcoli?: Json
          campagna_ripartizione_id: string
          created_at?: string | null
          id?: string
          importo_lordo?: number
          importo_netto?: number
          numero_individuazioni?: number
          storico_calcoli?: Json | null
          trattenuta_collecting?: number
          updated_at?: string | null
        }
        Update: {
          altre_trattenute?: number | null
          artista_id?: string
          calcoli?: Json
          campagna_ripartizione_id?: string
          created_at?: string | null
          id?: string
          importo_lordo?: number
          importo_netto?: number
          numero_individuazioni?: number
          storico_calcoli?: Json | null
          trattenuta_collecting?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ripartizioni_dettaglio_artista_id_fkey"
            columns: ["artista_id"]
            isOneToOne: false
            referencedRelation: "artisti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ripartizioni_dettaglio_campagna_ripartizione_id_fkey"
            columns: ["campagna_ripartizione_id"]
            isOneToOne: false
            referencedRelation: "campagne_ripartizione"
            referencedColumns: ["id"]
          },
        ]
      }
      ruoli_tipologie: {
        Row: {
          attivo: boolean | null
          categoria: Database["public"]["Enums"]["categoria_ruolo"]
          codice: string
          created_at: string | null
          descrizione: string | null
          id: string
          nome: string
          ordinamento: number | null
          parametri_ripartizione: Json
          updated_at: string | null
        }
        Insert: {
          attivo?: boolean | null
          categoria: Database["public"]["Enums"]["categoria_ruolo"]
          codice: string
          created_at?: string | null
          descrizione?: string | null
          id?: string
          nome: string
          ordinamento?: number | null
          parametri_ripartizione?: Json
          updated_at?: string | null
        }
        Update: {
          attivo?: boolean | null
          categoria?: Database["public"]["Enums"]["categoria_ruolo"]
          codice?: string
          created_at?: string | null
          descrizione?: string | null
          id?: string
          nome?: string
          ordinamento?: number | null
          parametri_ripartizione?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_campagna_processing_lock: {
        Args: {
          p_campagna_id: string
          p_timeout_hours?: number
          p_user_id: string
        }
        Returns: Json
      }
      check_campagna_processing_lock: {
        Args: { p_campagna_id: string; p_timeout_hours?: number }
        Returns: Json
      }
      finalize_campagna_individuazione: {
        Args: {
          p_campagne_individuazione_id: string
          p_campagne_programmazione_id: string
        }
        Returns: Json
      }
      get_user_artista_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["ruolo_utente"]
      }
      init_campagna_individuazione: {
        Args: {
          p_campagne_programmazione_id: string
          p_descrizione?: string
          p_nome_campagna_individuazione?: string
        }
        Returns: Json
      }
      match_programmazione_to_partecipazioni:
        | {
            Args: { p_programmazione_id: string; p_soglia_titolo?: number }
            Returns: {
              artista_id: string
              dettagli_matching: Json
              episodio_id: string
              opera_id: string
              partecipazione_id: string
              punteggio: number
              ruolo_id: string
            }[]
          }
        | {
            Args: {
              p_artista_ids?: string[]
              p_programmazione_id: string
              p_soglia_titolo?: number
            }
            Returns: {
              artista_id: string
              dettagli_matching: Json
              episodio_id: string
              opera_id: string
              partecipazione_id: string
              punteggio: number
              ruolo_id: string
            }[]
          }
      process_batch_individuazioni: {
        Args: {
          p_campagne_programmazione_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: Json
      }
      process_campagna_individuazione: {
        Args: {
          p_campagne_programmazione_id: string
          p_descrizione?: string
          p_nome_campagna_individuazione?: string
        }
        Returns: Json
      }
      process_campagna_individuazione_optimized: {
        Args: {
          p_batch_size?: number
          p_campagne_programmazione_id: string
          p_descrizione?: string
          p_nome_campagna_individuazione?: string
        }
        Returns: Json
      }
      process_films_batch: {
        Args: {
          p_batch_size?: number
          p_campagna_individuazioni_id: string
          p_campagna_programmazione_id: string
          p_offset?: number
        }
        Returns: {
          has_more: boolean
          inserted: number
          processed: number
        }[]
      }
      process_programmazioni_chunk:
        | {
            Args: {
              p_campagne_individuazione_id: string
              p_programmazione_ids: string[]
              p_soglia_titolo?: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_artista_ids?: string[]
              p_campagne_individuazione_id: string
              p_programmazione_ids: string[]
              p_soglia_titolo?: number
            }
            Returns: Json
          }
      release_campagna_processing_lock: {
        Args: { p_campagna_id: string; p_new_stato?: string; p_user_id: string }
        Returns: Json
      }
      search_artisti_fuzzy: {
        Args: { query_text: string; similarity_threshold?: number }
        Returns: {
          codice_artista: string
          cognome: string
          id: string
          nome: string
          nome_arte: string
          similarity_score: number
        }[]
      }
      search_opere_fuzzy: {
        Args: { query_text: string; similarity_threshold?: number }
        Returns: {
          anno_produzione: number
          generi: string[]
          id: string
          similarity_score: number
          titolo: string
          titolo_originale: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      categoria_ruolo: "recitazione" | "doppiaggio" | "direzione" | "tecnico"
      fascia_oraria:
        | "prima_serata"
        | "seconda_serata"
        | "access"
        | "daytime"
        | "notte"
      metodo_matching: "automatico" | "manuale" | "validato"
      ruolo_utente: "admin" | "operatore" | "artista" | "readonly"
      stato_campagna:
        | "pianificata"
        | "in_corso"
        | "completata"
        | "annullata"
        | "bozza"
        | "in review"
        | "approvata"
        | "individuata"
        | "uploading"
        | "deleting"
        | "error"
               | "in_review"
      stato_individuazione: "individuato" | "validato" | "respinto" | "dubbioso"
      stato_iscrizione: "attivo" | "sospeso" | "cessato"
      stato_ripartizione:
        | "pianificata"
        | "calcolata"
        | "approvata"
        | "distribuita"
      stato_validazione: "da_validare" | "validato" | "respinto"
      territorio_enum: "WW" | "WW-" | "ITA" | "ITA+"
      tipo_emittente: "tv_generalista" | "tv_tematica" | "streaming" | "pay_tv"
      tipo_opera: "film" | "serie_tv" | "documentario" | "cartoon" | "altro"
      tipo_trasmissione: "prima_visione" | "replica" | "ripetizione"
      tipologia_enum: "AIE" | "PRODUTTORE"
    }
    CompositeTypes: {
      contatto: {
        email: string | null
        telefono: string | null
        indirizzo: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"])
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"])
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof (DefaultSchema["Enums"])
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof (DefaultSchema["CompositeTypes"])
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      categoria_ruolo: ["recitazione", "doppiaggio", "direzione", "tecnico"],
      fascia_oraria: [
        "prima_serata",
        "seconda_serata",
        "access",
        "daytime",
        "notte",
      ],
      metodo_matching: ["automatico", "manuale", "validato"],
      ruolo_utente: ["admin", "operatore", "artista", "readonly"],
      stato_campagna: [
        "pianificata",
        "in_corso",
        "completata",
        "annullata",
        "bozza",
        "in review",
        "approvata",
        "individuata",
        "uploading",
        "deleting",
        "error",
        "in_review",
      ],
      stato_individuazione: ["individuato", "validato", "respinto", "dubbioso"],
      stato_iscrizione: ["attivo", "sospeso", "cessato"],
      stato_ripartizione: [
        "pianificata",
        "calcolata",
        "approvata",
        "distribuita",
      ],
      stato_validazione: ["da_validare", "validato", "respinto"],
      territorio_enum: ["WW", "WW-", "ITA", "ITA+"],
      tipo_emittente: ["tv_generalista", "tv_tematica", "streaming", "pay_tv"],
      tipo_opera: ["film", "serie_tv", "documentario", "cartoon", "altro"],
      tipo_trasmissione: ["prima_visione", "replica", "ripetizione"],
      tipologia_enum: ["AIE", "PRODUTTORE"],
    },
  },
} as const
