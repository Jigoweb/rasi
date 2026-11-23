import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { supabaseService } from '../supabase.js'
import {
  creaJobRipartizione,
  eseguiCalcoloRipartizione,
  RipartizioneJobError,
} from '../jobs/ripartizione-runner.js'

export const ripartizioneRouter = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CALCOLO = new Set(['admin', 'operatore'])
const LETTURA = new Set(['admin', 'operatore', 'operatore_base'])

/**
 * POST /api/ripartizione/:id/calcola
 * Avvia il calcolo della campagna di ripartizione (admin e Operatore pro).
 * Risponde subito con l'id del job; lo stato si legge da GET /jobs/:jobId.
 */
ripartizioneRouter.post('/:id/calcola', requireAuth, async (req, res) => {
  const campagnaId = req.params.id
  if (!CALCOLO.has(req.userRole ?? '')) {
    return res.status(403).json({ success: false, error: 'Solo amministratori e Operatori pro calcolano le ripartizioni' })
  }
  if (!UUID_RE.test(campagnaId)) {
    return res.status(400).json({ success: false, error: 'Campagna non valida' })
  }
  try {
    const jobId = await creaJobRipartizione(campagnaId, req.userId!)
    void eseguiCalcoloRipartizione(jobId, campagnaId)
    return res.status(202).json({ success: true, data: { jobId } })
  } catch (error) {
    if (error instanceof RipartizioneJobError) {
      return res.status(error.status).json({ success: false, error: error.message })
    }
    console.error('[ripartizione] avvio calcolo', error)
    return res.status(500).json({ success: false, error: 'Avvio del calcolo non riuscito' })
  }
})

/** GET /api/ripartizione/jobs/:jobId — stato del calcolo. */
ripartizioneRouter.get('/jobs/:jobId', requireAuth, async (req, res) => {
  if (!LETTURA.has(req.userRole ?? '')) {
    return res.status(403).json({ success: false, error: 'Non autorizzato' })
  }
  if (!UUID_RE.test(req.params.jobId)) {
    return res.status(400).json({ success: false, error: 'Job non valido' })
  }
  const { data, error } = await supabaseService
    .from('ripartizione_jobs')
    .select('id, campagna_ripartizione_id, stato, fase, righe_lette, righe_scritte, error, created_at, updated_at')
    .eq('id', req.params.jobId)
    .maybeSingle()
  if (error) return res.status(500).json({ success: false, error: 'Lettura del job non riuscita' })
  if (!data) return res.status(404).json({ success: false, error: 'Job non trovato' })
  return res.json({ success: true, data })
})
