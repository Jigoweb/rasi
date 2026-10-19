import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const serverDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

interface RailwayConfig {
  build?: { watchPatterns?: string[] }
  deploy?: { startCommand?: string }
}

const railwayConfig = JSON.parse(
  readFileSync(resolve(serverDir, 'railway.json'), 'utf8')
) as RailwayConfig

/**
 * Il SIGTERM dei deploy Railway arriva solo al processo principale del
 * container. Con `npm start` npm lo inoltra a `sh -c`, che muore senza
 * passarlo a Node: il gestore che rimette in coda le individuazioni non parte
 * e il job resta "running" finché il recovery non lo chiude dopo 30 minuti.
 */
describe('avvio del worker su Railway', () => {
  it('non passa da un package manager', () => {
    const startCommand = railwayConfig.deploy?.startCommand ?? ''
    assert.notEqual(startCommand, '')
    assert.doesNotMatch(startCommand, /^(npm|npx|yarn|pnpm)\b/)
  })

  it('rideploya il worker solo per modifiche sotto server/', () => {
    assert.deepEqual(railwayConfig.build?.watchPatterns, ['/server/**'])
  })

  it('con il comando di avvio il gestore SIGTERM viene eseguito', async () => {
    const [command, ...args] = (railwayConfig.deploy?.startCommand ?? '').split(/\s+/)
    const port = String(20000 + Math.floor(Math.random() * 20000))
    // Gruppo di processi separato: a fine test si chiude tutto l'albero,
    // anche eventuali figli rimasti orfani (come succede con `npm start`).
    const child = spawn(command, args, {
      cwd: serverDir,
      detached: true,
      env: {
        ...process.env,
        PORT: port,
        // Nessun database: il recovery all'avvio fallisce subito e basta.
        SUPABASE_URL: 'http://127.0.0.1:9',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        SUPABASE_ANON_KEY: 'test-anon-key',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let output = ''
    child.stdout.on('data', (chunk) => { output += chunk })
    child.stderr.on('data', (chunk) => { output += chunk })

    const exited = new Promise<number | null>((resolveExit) => {
      child.on('exit', (code) => resolveExit(code))
    })

    try {
      await waitFor(() => output.includes(`in ascolto sulla porta ${port}`), 20000)
      child.kill('SIGTERM')
      const code = await Promise.race([
        exited,
        new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 10000)),
      ])

      assert.match(output, /\[rasi-worker\] SIGTERM: 0 individuazioni rimesse in coda/)
      assert.equal(code, 143)
    } finally {
      try {
        process.kill(-child.pid!, 'SIGKILL')
      } catch {
        // Gruppo già terminato.
      }
      child.stdout.destroy()
      child.stderr.destroy()
    }
  })
})

async function waitFor(condition: () => boolean, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Il worker non si è avviato in tempo')
    await new Promise((r) => setTimeout(r, 100))
  }
}
