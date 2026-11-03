import fs from 'fs'
import path from 'path'

const root = path.resolve(__dirname, '../../../..')

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

describe('artisti.partita_iva text', () => {
  const migration = read('supabase/migrations/20261103092850_artisti_partita_iva_text.sql')

  it('converts bigint to text and pads only short numeric values', () => {
    expect(migration).toMatch(/ALTER COLUMN partita_iva TYPE text/i)
    expect(migration).toMatch(/char_length\(partita_iva::text\) < 11/)
    expect(migration).toMatch(/lpad\(partita_iva::text, 11, '0'\)/)
    expect(migration).toMatch(/WHEN partita_iva IS NULL THEN NULL/)
    expect(migration).not.toMatch(/::bigint/)
    expect(migration).toMatch(/v_patch->>'partita_iva'/)
  })
})

describe('artisti_dati_riservati visibility', () => {
  const migration = read('supabase/migrations/20261103083959_artisti_dati_riservati_regime.sql')

  it('enables RLS and grants the table only to admin and operatore', () => {
    expect(migration).toMatch(/ENABLE ROW LEVEL SECURITY/)
    expect(migration).toMatch(/SECURITY INVOKER/)
    expect(migration).not.toMatch(/SECURITY DEFINER/)
    expect(migration).toContain('regime')
    expect(migration).toContain('tassazione')
    expect(migration).toContain('dettagli_regime')

    const policies = migration.match(/CREATE POLICY[\s\S]*?;/g) ?? []
    expect(policies.length).toBeGreaterThan(0)
    for (const policy of policies) {
      expect(policy).toContain("'admin'")
      expect(policy).toContain("'operatore'")
      expect(policy).not.toContain("'artista'")
      expect(policy).not.toContain("'readonly'")
      expect(policy).not.toContain("'collecting'")
    }

    expect(migration).toMatch(/REVOKE ALL ON public\.artisti_dati_riservati FROM anon/)
    expect(migration).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON public\.artisti_dati_riservati TO authenticated, service_role/)
    expect(migration).toMatch(/get_user_role\(\) IS DISTINCT FROM 'admin' AND get_user_role\(\) IS DISTINCT FROM 'operatore'/)
  })

  it('does not expose the reserved fields from artist-facing reads', () => {
    const artistFacing = [
      'src/app/dashboard/profilo/components/profilo-dati-tab.tsx',
      'src/features/artisti/lib/artista-self-update.ts',
      'src/features/artisti/services/artisti.service.ts',
    ]
    for (const file of artistFacing) {
      const source = read(file)
      expect(source).not.toContain('artisti_dati_riservati')
      expect(source).not.toContain('dettagli_regime')
    }
  })

  it('shows the reserved fields on the staff artist page only for admin and operatore', () => {
    const page = read('src/app/dashboard/artisti/[id]/page.tsx')
    expect(page).toContain('ArtistaDatiRiservatiPanel')
    expect(page).toContain('canManageArtistiContatti')
  })
})
