import { supabase } from '@/shared/lib/supabase'

/**
 * Fetches a list of all artists, ordered by last name.
 * @returns An object with data and error properties.
 */
export const getArtisti = async () => {
  const { data, error } = await supabase
    .from('artisti')
    .select('*')
    .order('cognome', { ascending: true })

  return { data, error }
}

/**
 * Fetches a single artist by their ID.
 * @param id - The ID of the artist to fetch.
 * @returns An object with data and error properties.
 */
export const getArtistaById = async (id: string) => {
  const { data, error } = await supabase
    .from('artisti')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error }
}

/**
 * Fetches all participations for a given artist, including related work, role, and episode details.
 * @param artistaId - The ID of the artist.
 * @returns An object with data and error properties.
 */
export const getPartecipazioniByArtistaId = async (artistaId: string) => {
  const { data, error } = await supabase
    .from('partecipazioni')
    .select(`
      id,
      personaggio,
      note,
      stato_validazione,
      created_at,
      opere (
        id,
        codice_opera,
        titolo,
        titolo_originale,
        tipo,
        anno_produzione
      ),
      ruoli_tipologie (
        id,
        nome,
        descrizione
      ),
      episodi (
        id,
        titolo_episodio,
        numero_episodio
      )
    `)
    .eq('artista_id', artistaId)
    .order('created_at', { ascending: false })

  return { data, error }
}
