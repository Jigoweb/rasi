import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { individuazioneRouter } from './routes/individuazione.js'
import { jobsRouter } from './routes/jobs.js'

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

app.listen(config.port, () => {
  console.log(`[rasi-worker] in ascolto sulla porta ${config.port}`)
})
