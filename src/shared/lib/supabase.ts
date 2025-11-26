export type Database = {
  public: {
    Tables: {
      artisti: {
        Row: {
          id: string
          codice_ipn: string
          nome: string
          cognome: string
          nome_arte: string | null
          codice_fiscale: string | null
          data_nascita: string | null
          luogo_nascita: string | null
          territorio: string | null
          data_inizio_mandato: string
          stato: string
          contatti: any | null
          imdb_nconst: string | null
          codici_esterni: any | null
          search_vector: string | null
          tipologia: string | null
          componente_stabile_gruppo_orchestra: string | null
          ragione_sociale: string | null
          forma_giuridica: string | null
          partita_iva: number | null
          codice_paese: string | null
          diritti_attivi: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codice_ipn: string
          nome: string
          cognome: string
          nome_arte?: string | null
          codice_fiscale?: string | null
          data_nascita?: string | null
          luogo_nascita?: string | null
          territorio?: string | null
          data_inizio_mandato?: string
          stato?: string
          contatti?: any | null
          imdb_nconst?: string | null
          codici_esterni?: any | null
          search_vector?: string | null
          tipologia?: string | null
          componente_stabile_gruppo_orchestra?: string | null
          ragione_sociale?: string | null
          forma_giuridica?: string | null
          partita_iva?: number | null
          codice_paese?: string | null
          diritti_attivi?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codice_ipn?: string
          nome?: string
          cognome?: string
          nome_arte?: string | null
          codice_fiscale?: string | null
          data_nascita?: string | null
          luogo_nascita?: string | null
          territorio?: string | null
          data_inizio_mandato?: string
          stato?: string
          contatti?: any | null
          imdb_nconst?: string | null
          codici_esterni?: any | null
          search_vector?: string | null
          tipologia?: string | null
          componente_stabile_gruppo_orchestra?: string | null
          ragione_sociale?: string | null
          forma_giuridica?: string | null
          partita_iva?: number | null
          codice_paese?: string | null
          diritti_attivi?: any | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      opere: {
        Row: {
          id: string
          codice_opera: string
          titolo: string
          titolo_originale: string | null
          alias_titoli: string[] | null
          tipo: string
          anno_produzione: number | null
          regista: string[] | null
          dettagli_serie: any | null
          codice_isan: string | null
          imdb_tconst: string | null
          codici_esterni: any | null
          metadati: any | null
          search_vector: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codice_opera: string
          titolo: string
          titolo_originale?: string | null
          alias_titoli?: string[] | null
          tipo: string
          anno_produzione?: number | null
          regista?: string[] | null
          dettagli_serie?: any | null
          codice_isan?: string | null
          imdb_tconst?: string | null
          codici_esterni?: any | null
          metadati?: any | null
          search_vector?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codice_opera?: string
          titolo?: string
          titolo_originale?: string | null
          alias_titoli?: string[] | null
          tipo?: string
          anno_produzione?: number | null
          regista?: string[] | null
          dettagli_serie?: any | null
          codice_isan?: string | null
          imdb_tconst?: string | null
          codici_esterni?: any | null
          metadati?: any | null
          search_vector?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      programmazioni: {
        Row: {
          id: string
          data_trasmissione: string
          ora_inizio: string
          ora_fine: string | null
          titolo: string
          fascia_oraria: string | null
          tipo_trasmissione: string | null
          durata_minuti: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          data_trasmissione: string
          ora_inizio: string
          ora_fine?: string | null
          titolo: string
          fascia_oraria?: string | null
          tipo_trasmissione?: string | null
          durata_minuti?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          data_trasmissione?: string
          ora_inizio?: string
          ora_fine?: string | null
          titolo?: string
          fascia_oraria?: string | null
          tipo_trasmissione?: string | null
          durata_minuti?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      campagne_individuazione: {
        Row: {
          id: string
          nome: string
          descrizione: string | null
          stato: string
          data_inizio: string
          data_fine: string | null
          parametri_individuazione: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descrizione?: string | null
          stato?: string
          data_inizio: string
          data_fine?: string | null
          parametri_individuazione?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descrizione?: string | null
          stato?: string
          data_inizio?: string
          data_fine?: string | null
          parametri_individuazione?: any | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      campagne_ripartizione: {
        Row: {
          id: string
          nome: string
          descrizione: string | null
          stato: string
          data_inizio: string
          data_fine: string | null
          parametri_ripartizione: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descrizione?: string | null
          stato?: string
          data_inizio: string
          data_fine?: string | null
          parametri_ripartizione?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descrizione?: string | null
          stato?: string
          data_inizio?: string
          data_fine?: string | null
          parametri_ripartizione?: any | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      emittenti: {
        Row: {
          id: string
          codice: string
          nome: string
          tipo: string
          paese: string | null
          configurazione: any
          contatti: any | null
          metadati: any | null
          attiva: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          codice: string
          nome: string
          tipo: string
          paese?: string | null
          configurazione?: any
          contatti?: any | null
          metadati?: any | null
          attiva?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          codice?: string
          nome?: string
          tipo?: string
          paese?: string | null
          configurazione?: any
          contatti?: any | null
          metadati?: any | null
          attiva?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      episodi: {
        Row: {
          id: string
          opera_id: string
          numero_stagione: number
          numero_episodio: number
          titolo_episodio: string | null
          descrizione: string | null
          durata_minuti: number | null
          data_prima_messa_in_onda: string | null
          metadati: any | null
          created_at: string
        }
        Insert: {
          id?: string
          opera_id: string
          numero_stagione: number
          numero_episodio: number
          titolo_episodio?: string | null
          descrizione?: string | null
          durata_minuti?: number | null
          data_prima_messa_in_onda?: string | null
          metadati?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          opera_id?: string
          numero_stagione?: number
          numero_episodio?: number
          titolo_episodio?: string | null
          descrizione?: string | null
          durata_minuti?: number | null
          data_prima_messa_in_onda?: string | null
          metadati?: any | null
          created_at?: string
        }
        Relationships: []
      }
      ruoli_tipologie: {
        Row: {
          id: string
          codice: string
          nome: string
          categoria: string
          parametri_ripartizione: any | null
          descrizione: string | null
          ordinamento: number | null
          attivo: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codice: string
          nome: string
          categoria: string
          parametri_ripartizione?: any | null
          descrizione?: string | null
          ordinamento?: number | null
          attivo?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codice?: string
          nome?: string
          categoria?: string
          parametri_ripartizione?: any | null
          descrizione?: string | null
          ordinamento?: number | null
          attivo?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      partecipazioni: {
        Row: {
          id: string
          artista_id: string
          opera_id: string
          episodio_id: string | null
          ruolo_id: string
          personaggio: string | null
          note: string | null
          parametri_personalizzati: any | null
          stato_validazione: string | null
          validato_da: string | null
          validato_il: string | null
          note_validazione: string | null
          metadati: any | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          artista_id: string
          opera_id: string
          episodio_id?: string | null
          ruolo_id: string
          personaggio?: string | null
          note?: string | null
          parametri_personalizzati?: any | null
          stato_validazione?: string | null
          validato_da?: string | null
          validato_il?: string | null
          note_validazione?: string | null
          metadati?: any | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          artista_id?: string
          opera_id?: string
          episodio_id?: string | null
          ruolo_id?: string
          personaggio?: string | null
          note?: string | null
          parametri_personalizzati?: any | null
          stato_validazione?: string | null
          validato_da?: string | null
          validato_il?: string | null
          note_validazione?: string | null
          metadati?: any | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

// Re-export the singleton client
export { supabase } from './supabase-client'

export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
