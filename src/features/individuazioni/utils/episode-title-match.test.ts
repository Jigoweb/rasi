/**
 * @jest-environment node
 */
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

function latestEpisodeMatcher(): string {
  const dir = path.join(process.cwd(), 'supabase/migrations')
  const files = readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()
  let body = ''
  for (const file of files) {
    const text = readFileSync(path.join(dir, file), 'utf8')
    if (text.includes('v_episodio.titolo_episodio') && text.includes('similarity(')) {
      body = text
    }
  }
  return body
}

describe('matcher titoli episodio', () => {
  const sql = latestEpisodeMatcher()

  it('aggiunge il titolo originale sul catalogo episodi', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS titolo_episodio_originale text/i)
  })

  it('confronta le quattro coppie italiano/originale come per i film', () => {
    const block = sql.slice(sql.indexOf('Titoli episodio come i film'))
    expect(block).toContain('COALESCE(similarity(LOWER(v_prog.titolo_episodio), LOWER(v_episodio.titolo_episodio)), 0)')
    expect(block).toContain('COALESCE(similarity(LOWER(v_prog.titolo_episodio), LOWER(v_episodio.titolo_episodio_originale)), 0)')
    expect(block).toContain('COALESCE(similarity(LOWER(v_prog.titolo_episodio_originale), LOWER(v_episodio.titolo_episodio)), 0)')
    expect(block).toContain('COALESCE(similarity(LOWER(v_prog.titolo_episodio_originale), LOWER(v_episodio.titolo_episodio_originale)), 0)')
    expect(block).toContain('IF v_ep_title_score >= 0.6 THEN')
  })
})
