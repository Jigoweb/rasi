import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/shared/lib/supabase-server'

/**
 * POST /api/campagne-individuazione/get-batch-ids
 * 
 * Ottiene un batch di programmazione_ids per il processing paginato.
 * Usa cursor-based pagination per performance ottimale su grandi dataset.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      campagne_programmazione_id,
      last_id = null,  // Cursor: ultimo ID processato
      limit = 500,
      only_unprocessed = false  // Resume: salta le programmazioni già processate
    } = body

    if (!campagne_programmazione_id) {
      return NextResponse.json(
        { success: false, error: 'campagne_programmazione_id è obbligatorio' },
        { status: 400 }
      )
    }

    // Cursor-based pagination: molto più veloce di OFFSET per grandi dataset
    // Invece di "OFFSET 19000" che deve saltare 19000 righe,
    // usiamo "WHERE id > last_id" che usa l'indice direttamente
    let query = supabaseServer
      .from('programmazioni')
      .select('id')
      .eq('campagna_programmazione_id', campagne_programmazione_id)
      .limit(limit)

    if (only_unprocessed) {
      // Prende solo le programmazioni non ancora processate, SENZA ORDER BY/cursor.
      // CRITICO: con `ORDER BY id LIMIT n` il planner sceglie un Index Scan sulla
      // PK (id) filtrando per campagna → per campagne con id alti scansiona
      // milioni di righe prima di trovarne n → statement timeout.
      // Senza order-by usa l'indice su campagna_programmazione_id (cost ~21).
      // L'avanzamento è garantito: il chunk marca processato=true e le righe
      // spariscono dal filtro, quindi non serve il cursore.
      query = query.or('processato.is.null,processato.eq.false')
    } else {
      // Primo passaggio classico: cursor su id crescente.
      query = query.order('id', { ascending: true })
      if (last_id) {
        query = query.gt('id', last_id)
      }
    }

    const { data: programmazioni, error: progError } = await query

    if (progError) {
      console.error('Errore caricamento batch:', progError)
      return NextResponse.json(
        { success: false, error: progError.message },
        { status: 500 }
      )
    }

    const programmazioneIds = programmazioni?.map(p => p.id) || []
    const newLastId = programmazioneIds.length > 0 
      ? programmazioneIds[programmazioneIds.length - 1] 
      : null

    return NextResponse.json({
      success: true,
      data: {
        programmazione_ids: programmazioneIds,
        count: programmazioneIds.length,
        last_id: newLastId,  // Cursor per il prossimo batch
        has_more: programmazioneIds.length === limit
      }
    })

  } catch (error: any) {
    console.error('Errore inatteso:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Errore inatteso' },
      { status: 500 }
    )
  }
}


