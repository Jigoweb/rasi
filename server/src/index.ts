import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { interruptActiveJobs, resumeInterruptedJobs } from './jobs/auto-resume.js'
import { markStaleActiveJobsAsError, markStaleActiveUploadJobsAsError } from './jobs/recovery.js'
import { individuazioneRouter } from './routes/individuazione.js'
import { jobsRouter } from './routes/jobs.js'
import { uploadJobsRouter, uploadProgrammazioniRouter } from './routes/upload-programmazioni.js'

const app = express()

// CORS: consenti solo i domini frontend configurati (tutti, se lista vuota → dev).
app.use(
  cors({
    origin: config.allowedOrigins.length > 0 ? config.allowedOrigins : true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use(express.json({ limit: '2mb' }))

// Healthcheck (Railway lo usa per verificare che il servizio sia su).
app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api/individuazione', individuazioneRouter)
app.use('/api/jobs', jobsRouter)
app.use('/api/upload-programmazioni', uploadProgrammazioniRouter)
app.use('/api/upload-jobs', uploadJobsRouter)

const server = app.listen(config.port, () => {
  console.log(`[rasi-worker] in ascolto sulla porta ${config.port}`)

  const runStaleRecovery = () => {
    void Promise.all([
      markStaleActiveJobsAsError(),
      markStaleActiveUploadJobsAsError(),
    ])
      .then(([campaignJobs, uploadJobs]) => {
        if (campaignJobs > 0 || uploadJobs > 0) {
          console.log(`[rasi-worker] recovery job stale: ${campaignJobs} individuazioni, ${uploadJobs} upload marcati in errore`)
        }
      })
      .catch((error) => {
        console.error('[rasi-worker] recovery job stale fallita', error)
      })
  }

  runStaleRecovery()
  // Periodico: i job upload possono bloccarsi senza riavvio del processo.
  const staleRecoveryTimer = setInterval(runStaleRecovery, 5 * 60 * 1000)

  // Ripresa automatica dei job rimessi in coda da un deploy del worker.
  const runAutoResume = () => {
    void resumeInterruptedJobs()
      .then((count) => {
        if (count > 0) {
          console.log(`[rasi-worker] ripresa automatica: ${count} individuazioni riavviate`)
        }
      })
      .catch((error) => {
        console.error('[rasi-worker] ripresa automatica fallita', error)
      })
  }
  const autoResumeTimer = setInterval(runAutoResume, 60 * 1000)

  // Deploy Railway: SIGTERM poco prima dello stop del container. I job in
  // corso tornano in coda e il worker successivo li riprende da solo.
  let shuttingDown = false
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return
    shuttingDown = true
    clearInterval(staleRecoveryTimer)
    clearInterval(autoResumeTimer)
    server.close()

    // Codice di uscita convenzionale (128 + segnale): uno stop inatteso resta
    // un fallimento per la restart policy ON_FAILURE di Railway.
    const exitCode = signal === 'SIGINT' ? 130 : 143
    const forceExit = setTimeout(() => process.exit(exitCode), 5000)
    forceExit.unref()

    void interruptActiveJobs()
      .then((count) => {
        console.log(`[rasi-worker] ${signal}: ${count} individuazioni rimesse in coda`)
      })
      .catch((error) => {
        console.error(`[rasi-worker] ${signal}: messa in coda dei job fallita`, error)
      })
      .finally(() => process.exit(exitCode))
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
})
