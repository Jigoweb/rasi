import { supabase } from '@/shared/lib/supabase'

export interface CampagnaProgrammazionePayload {
  emittente_id: string
  anno: number
  nome: string
  stato?: string
  created_by?: string
}

export interface CampagnaProgrammazione {
  id: string
  emittente_id: string
  anno: number
  nome: string
  stato: string
  created_at: string
  created_by: string | null
  emittenti?: {
    nome: string
  }
}

export const getCampagneProgrammazione = async () => {
  const { data, error } = await supabase
    .from('campagne_programmazione' as any)
    .select('*, emittenti(nome)')
    .order('created_at', { ascending: false })

  return { data: (data as unknown) as CampagnaProgrammazione[], error }
}

export const createCampagnaProgrammazione = async (payload: CampagnaProgrammazionePayload) => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  const payloadWithUser = {
    ...payload,
    stato: 'bozza',
    created_by: user?.id
  }

  const { data, error } = await supabase
    .from('campagne_programmazione' as any) // Type assertion until schema is updated
    .insert([payloadWithUser])
    .select()
    .single()

  return { data, error }
}

export interface ProgrammazionePayload {
  campagna_id: string
  emittente_id: string
  data_trasmissione: string
  ora_inizio: string
  titolo_programmazione: string
  durata_minuti?: number
  descrizione?: string
}

export const uploadProgrammazioni = async (programmazioni: ProgrammazionePayload[]) => {
  const { data, error } = await supabase
    .from('programmazioni')
    .insert(programmazioni)
    .select()

  return { data, error }
}

export const updateCampagnaStatus = async (id: string, stato: string) => {
  const { data, error } = await supabase
    .from('campagne_programmazione' as any)
    .update({ stato })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}
