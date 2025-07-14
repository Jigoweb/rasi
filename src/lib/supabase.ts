export type Database = {
  public: {
    Tables: {
      artisti: {
        Row: {
          id: string
          codice_artista: string
          nome: string
          cognome: string
          nome_arte: string | null
          codice_fiscale: string | null
          data_nascita: string | null
          stato: string
          data_iscrizione: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codice_artista: string
          nome: string
          cognome: string
          nome_arte?: string | null
          codice_fiscale?: string | null
          data_nascita?: string | null
          stato?: string
          data_iscrizione?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codice_artista?: string
          nome?: string
          cognome?: string
          nome_arte?: string | null
          codice_fiscale?: string | null
          data_nascita?: string | null
          stato?: string
          data_iscrizione?: string
          created_at?: string
          updated_at?: string
        }
      }
      opere: {
        Row: {
          id: string
          codice_opera: string
          titolo: string
          titolo_originale: string | null
          tipo: string
          anno_produzione: number
          durata_minuti: number | null
          generi: string[] | null
          paese_produzione: string[] | null
          casa_produzione: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codice_opera: string
          titolo: string
          titolo_originale?: string | null
          tipo: string
          anno_produzione: number
          durata_minuti?: number | null
          generi?: string[] | null
          paese_produzione?: string[] | null
          casa_produzione?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codice_opera?: string
          titolo?: string
          titolo_originale?: string | null
          tipo?: string
          anno_produzione?: number
          durata_minuti?: number | null
          generi?: string[] | null
          paese_produzione?: string[] | null
          casa_produzione?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      programmazioni: {
        Row: {
          id: string
          data_trasmissione: string
          ora_inizio: string
          ora_fine: string | null
          titolo_programmazione: string
          fascia_oraria: string | null
          tipo_trasmissione: string | null
          durata_minuti: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          data_trasmissione: string
          ora_inizio: string
          ora_fine?: string | null
          titolo_programmazione: string
          fascia_oraria?: string | null
          tipo_trasmissione?: string | null
          durata_minuti?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          data_trasmissione?: string
          ora_inizio?: string
          ora_fine?: string | null
          titolo_programmazione?: string
          fascia_oraria?: string | null
          tipo_trasmissione?: string | null
          durata_minuti?: number | null
          created_at?: string
          updated_at?: string
        }
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
          stato_validazione: string
          validato_da: string | null
          validato_il: string | null
          note_validazione: string | null
          metadati: any | null
          created_at: string
          updated_at: string
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
          stato_validazione?: string
          validato_da?: string | null
          validato_il?: string | null
          note_validazione?: string | null
          metadati?: any | null
          created_at?: string
          updated_at?: string
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
          stato_validazione?: string
          validato_da?: string | null
          validato_il?: string | null
          note_validazione?: string | null
          metadati?: any | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Re-export the singleton client
export { supabase } from './supabase-client'