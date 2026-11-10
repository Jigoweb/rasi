# Episodi group-by-season peek — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nella scheda opera, raggruppare gli episodi per stagione con anteprima (~1,5 righe + fade + Espandi) e azioni riga in menu `⋯`.

**Architecture:** Helper puro `groupEpisodiByStagione` + componente UI `EpisodiByStagione` (desktop table / mobile cards) montato nella card Episodi di `page.tsx`. Stato expand locale (`Set`); peek via CSS `max-height` + gradient, non Accordion.

**Tech Stack:** React, TypeScript, shadcn Table/Button/DropdownMenu, Lucide, Jest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-03-episodi-group-by-season-peek-design.md`

## Global Constraints

- Default: tutte le stagioni in anteprima; nessun persist dello stato expand.
- Layout B: fade bianco + CTA **Espandi stagione** centrata sull’overlay; **Riduci** nel header quando espanso.
- Peek solo se `count >= 2`; altrimenti elenco intero senza CTA.
- Header: `Stagione N · X episodio/i` (plurale IT); `numero_stagione` null → **Senza stagione**.
- Omettere colonna Stagione nelle mini-tabelle.
- Azioni: solo `DropdownMenu` + `MoreHorizontal` (Modifica / Elimina destructive).
- Gradient overlay: `pointer-events-none`; solo il bottone Espandi ha `pointer-events-auto`.
- Nessuna migrazione DB / cambio API.

## File map

| File | Ruolo |
|------|--------|
| `src/features/opere/lib/episodi-by-stagione.ts` | `groupEpisodiByStagione`, label stagione, chiave expand |
| `src/features/opere/lib/episodi-by-stagione.test.ts` | Test helper |
| `src/app/dashboard/opere/[id]/components/episodi-by-stagione.tsx` | UI peek + menu azioni (desktop/mobile) |
| `src/app/dashboard/opere/[id]/page.tsx` | Sostituire lista piatta con il componente |
| `src/app/dashboard/opere/[id]/page.test.tsx` | Test header/Espandi/Riduci |

---

### Task 1: Helper `groupEpisodiByStagione`

**Files:**
- Create: `src/features/opere/lib/episodi-by-stagione.ts`
- Create: `src/features/opere/lib/episodi-by-stagione.test.ts`

**Interfaces:**
- Produces:
  - `export type StagioneKey = number | 'none'`
  - `export type EpisodioStagioneFields = { numero_stagione: number | null; numero_episodio: number | null }`
  - `export type EpisodiStagioneGroup<T> = { key: StagioneKey; stagione: number | null; episodi: T[]; count: number }`
  - `export function stagioneKey(numero: number | null | undefined): StagioneKey`
  - `export function groupEpisodiByStagione<T extends EpisodioStagioneFields>(episodi: T[]): EpisodiStagioneGroup<T>[]`
  - `export function formatStagioneHeader(stagione: number | null, count: number): string`

- [x] **Step 1: Scrivere i test che falliscono**

```ts
import {
  groupEpisodiByStagione,
  formatStagioneHeader,
  stagioneKey,
} from './episodi-by-stagione'

describe('stagioneKey', () => {
  it('mappa null/undefined a none', () => {
    expect(stagioneKey(null)).toBe('none')
    expect(stagioneKey(undefined)).toBe('none')
    expect(stagioneKey(2)).toBe(2)
  })
})

describe('groupEpisodiByStagione', () => {
  it('raggruppa, ordina stagioni e episodi, mette null in coda', () => {
    const groups = groupEpisodiByStagione([
      { id: 'c', numero_stagione: 2, numero_episodio: 1 },
      { id: 'a', numero_stagione: 1, numero_episodio: 2 },
      { id: 'z', numero_stagione: null, numero_episodio: 1 },
      { id: 'b', numero_stagione: 1, numero_episodio: 1 },
    ])
    expect(groups.map((g) => g.key)).toEqual([1, 2, 'none'])
    expect(groups[0]).toMatchObject({ stagione: 1, count: 2 })
    expect(groups[0].episodi.map((e) => e.id)).toEqual(['b', 'a'])
    expect(groups[2]).toMatchObject({ key: 'none', stagione: null, count: 1 })
  })

  it('lista vuota → []', () => {
    expect(groupEpisodiByStagione([])).toEqual([])
  })
})

describe('formatStagioneHeader', () => {
  it('plurale italiano e senza stagione', () => {
    expect(formatStagioneHeader(1, 1)).toBe('Stagione 1 · 1 episodio')
    expect(formatStagioneHeader(1, 12)).toBe('Stagione 1 · 12 episodi')
    expect(formatStagioneHeader(null, 3)).toBe('Senza stagione · 3 episodi')
  })
})
```

- [ ] **Step 2: Far fallire i test**

Run: `npm test -- src/features/opere/lib/episodi-by-stagione.test.ts`
Expected: FAIL (modulo assente)

- [ ] **Step 3: Implementazione minima**

```ts
export type StagioneKey = number | 'none'

export type EpisodioStagioneFields = {
  numero_stagione: number | null
  numero_episodio: number | null
}

export type EpisodiStagioneGroup<T> = {
  key: StagioneKey
  stagione: number | null
  episodi: T[]
  count: number
}

export function stagioneKey(numero: number | null | undefined): StagioneKey {
  return typeof numero === 'number' ? numero : 'none'
}

export function groupEpisodiByStagione<T extends EpisodioStagioneFields>(
  episodi: T[],
): EpisodiStagioneGroup<T>[] {
  const map = new Map<StagioneKey, T[]>()
  for (const ep of episodi) {
    const key = stagioneKey(ep.numero_stagione)
    const list = map.get(key) ?? []
    list.push(ep)
    map.set(key, list)
  }

  const numericKeys = [...map.keys()]
    .filter((k): k is number => k !== 'none')
    .sort((a, b) => a - b)
  const orderedKeys: StagioneKey[] = [...numericKeys]
  if (map.has('none')) orderedKeys.push('none')

  return orderedKeys.map((key) => {
    const list = [...(map.get(key) ?? [])].sort(
      (a, b) => (a.numero_episodio ?? 9999) - (b.numero_episodio ?? 9999),
    )
    return {
      key,
      stagione: key === 'none' ? null : key,
      episodi: list,
      count: list.length,
    }
  })
}

export function formatStagioneHeader(stagione: number | null, count: number): string {
  const label = stagione === null ? 'Senza stagione' : `Stagione ${stagione}`
  const epLabel = count === 1 ? '1 episodio' : `${count} episodi`
  return `${label} · ${epLabel}`
}
```

- [ ] **Step 4: Far passare i test**

Run: `npm test -- src/features/opere/lib/episodi-by-stagione.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/opere/lib/episodi-by-stagione.ts src/features/opere/lib/episodi-by-stagione.test.ts
git commit -m "$(cat <<'EOF'
feat(opere): group episodi by season helper

EOF
)"
```

---

### Task 2: Componente `EpisodiByStagione` (peek + menu azioni)

**Files:**
- Create: `src/app/dashboard/opere/[id]/components/episodi-by-stagione.tsx`

**Interfaces:**
- Consumes: `groupEpisodiByStagione`, `formatStagioneHeader`, `StagioneKey` da `episodi-by-stagione.ts`
- Produces: `export function EpisodiByStagione(props: EpisodiByStagioneProps)`

Tipo episodio minimo (allineato ai campi già usati in page):

```ts
export type EpisodioListItem = {
  id: string
  numero_stagione: number | null
  numero_episodio: number | null
  titolo_episodio: string | null
  titolo_episodio_originale: string | null
  data_prima_messa_in_onda: string | null
  durata_minuti: number | null
  imdb_tconst: string | null
  codice_isan: string | null
}

export type EpisodiByStagioneProps = {
  episodi: EpisodioListItem[]
  onEdit: (episodio: EpisodioListItem) => void
  onDelete: (episodio: EpisodioListItem) => void
  emptyActions?: React.ReactNode
}
```

Altezza peek fissa: classe `max-h-[4.75rem]` (≈ 1,5 righe con `py-4`).

- [ ] **Step 1: Creare il componente**

Struttura:

1. Se `episodi.length === 0` → empty state con `emptyActions` (stesso copy della page attuale).
2. `useState<Set<StagioneKey>>(() => new Set())` per `expanded`.
3. `groups = groupEpisodiByStagione(episodi)`.
4. Per ogni gruppo, blocco:
   - Header flex: `formatStagioneHeader` a sinistra; se `expanded.has(key)` e `count >= 2`, bottone outline sm **Riduci** a destra.
   - Body wrapper `relative`:
     - Contenuto desktop (`hidden lg:block`): `Table` senza colonna Stagione; colonne Episodio, Titolo italiano, Titolo originale, Data, Durata, IMDb tconst, Codice ISAN, azioni.
     - Contenuto mobile (`lg:hidden`): card come in page attuale.
     - Se `count >= 2` e non expanded: wrapper contenuto con `max-h-[4.75rem] overflow-hidden`; overlay assoluto in basso con `pointer-events-none` + `bg-gradient-to-b from-transparent to-background` (o `to-card` / bianco `#fff` se lo sfondo card è bianco — usare `to-background` solo se coincide; sulla card attuale lo sfondo è card/white → `to-white` / `to-card`).
     - Bottone centrato sull’overlay: `pointer-events-auto`, label **Espandi stagione**, `aria-expanded={false}`.
   - Se expanded o `count < 2`: nessun max-height / overlay.

Menu azioni riga (desktop e mobile), pattern Artisti:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button aria-label="Azioni episodio" variant="ghost" size="icon" className="h-8 w-8">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => onEdit(e)}>
      <Edit className="h-4 w-4 mr-2" />
      Modifica episodio
    </DropdownMenuItem>
    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(e)}>
      <Trash2 className="h-4 w-4 mr-2" />
      Elimina episodio
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Celle IMDb/ISAN/date/durata: copiare markup da `page.tsx` (link IMDb, `toLocaleDateString('it-IT')`, `—` per vuoti).

Toggle helpers:

```ts
function toggleSeason(key: StagioneKey, open: boolean) {
  setExpanded((prev) => {
    const next = new Set(prev)
    if (open) next.add(key)
    else next.delete(key)
    return next
  })
}
```

Import UI da `@/shared/components/ui/*` e icone da `lucide-react` (come il resto del dashboard).

- [ ] **Step 2: Commit del componente (ancora non montato)**

```bash
git add src/app/dashboard/opere/[id]/components/episodi-by-stagione.tsx
git commit -m "$(cat <<'EOF'
feat(opere): add season-peek episodi list component

EOF
)"
```

---

### Task 3: Montare il componente in `page.tsx`

**Files:**
- Modify: `src/app/dashboard/opere/[id]/page.tsx` (sezione Episodi ~L1363–1543)

**Interfaces:**
- Consumes: `EpisodiByStagione` da `./components/episodi-by-stagione`

- [ ] **Step 1: Sostituire il body della card Episodi**

Tenere `CardHeader` (titolo, import, Aggiungi episodio) invariato.

In `CardContent`, sostituire i due blocchi desktop/mobile con:

```tsx
<CardContent className="p-0">
  <EpisodiByStagione
    episodi={episodi || []}
    onEdit={openEditEpisodioDialog}
    onDelete={openDeleteEpisodioDialog}
    emptyActions={
      <Button type="button" variant="outline" size="sm" onClick={openAddEpisodioDialog}>
        <Plus className="h-4 w-4 mr-2" />
        Aggiungi il primo episodio
      </Button>
    }
  />
</CardContent>
```

Empty state interno al componente: wrapper padding/centering come prima (`text-center py-12` desktop-equivalent; il componente può usare un unico empty state padded).

Rimuovere dal `page.tsx` solo il markup lista episodi sostituito (non i dialog add/edit/delete).

- [ ] **Step 2: Verificare che la pagina compili**

Run: `npx tsc --noEmit --pretty false 2>&1 | head -40`  
oppure smoke: `npm test -- src/app/dashboard/opere/[id]/page.test.tsx`

Expected: test esistenti ancora verdi (1 episodio → header colonne ancora presenti; nessun Espandi).

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/opere/[id]/page.tsx
git commit -m "$(cat <<'EOF'
feat(opere): wire season-peek episodi list on detail page

EOF
)"
```

---

### Task 4: Test pagina dettaglio (Espandi / Riduci)

**Files:**
- Modify: `src/app/dashboard/opere/[id]/page.test.tsx`

**Interfaces:**
- Consumes: UI labels `Espandi stagione`, `Riduci`, `Stagione 1 · 2 episodi`

- [ ] **Step 1: Aggiungere test con 2 episodi stessa stagione**

Mock `getOperaById` con `tipo: 'serie_tv', has_episodes: true` e due episodi S1E1 / S1E2.

```ts
it('raggruppa gli episodi per stagione con anteprima espandibile', async () => {
  const user = userEvent.setup()
  ;(getOperaById as jest.Mock).mockResolvedValueOnce({
    data: { ...operaFixture, tipo: 'serie_tv', has_episodes: true },
    error: null,
  })
  const { getEpisodiByOperaId } = jest.requireMock('@/features/opere/services/opere.service') as {
    getEpisodiByOperaId: jest.Mock
  }
  getEpisodiByOperaId.mockResolvedValueOnce({
    data: [
      {
        id: 'ep1',
        numero_stagione: 1,
        numero_episodio: 1,
        titolo_episodio: 'Pilota',
        titolo_episodio_originale: 'Pilot',
        descrizione: null,
        durata_minuti: 40,
        data_prima_messa_in_onda: null,
        imdb_tconst: null,
        codice_isan: null,
      },
      {
        id: 'ep2',
        numero_stagione: 1,
        numero_episodio: 2,
        titolo_episodio: 'Il quinto oboe',
        titolo_episodio_originale: 'The Fifth Oboe',
        descrizione: null,
        durata_minuti: 40,
        data_prima_messa_in_onda: null,
        imdb_tconst: null,
        codice_isan: null,
      },
    ],
    error: null,
  })

  render(<OperaDetailPage />)

  expect(await screen.findByText('Stagione 1 · 2 episodi')).toBeInTheDocument()
  const expand = await screen.findByRole('button', { name: 'Espandi stagione' })
  expect(screen.queryByRole('button', { name: 'Riduci' })).not.toBeInTheDocument()

  await user.click(expand)
  expect(await screen.findByRole('button', { name: 'Riduci' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Espandi stagione' })).not.toBeInTheDocument()
  expect(screen.getByText('Pilota')).toBeInTheDocument()
  expect(screen.getByText('Il quinto oboe')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Riduci' }))
  expect(await screen.findByRole('button', { name: 'Espandi stagione' })).toBeInTheDocument()
})
```

Aggiornare se necessario il test a 1 episodio: deve ancora trovare titoli; **non** deve trovare `Espandi stagione`.

- [ ] **Step 2: Far passare i test**

Run: `npm test -- src/app/dashboard/opere/[id]/page.test.tsx src/features/opere/lib/episodi-by-stagione.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/opere/[id]/page.test.tsx
git commit -m "$(cat <<'EOF'
test(opere): cover season peek expand/collapse on detail page

EOF
)"
```

---

## Spec coverage (self-review)

| Spec | Task |
|------|------|
| Raggruppa per stagione, default anteprima | 1 + 2 + 3 |
| Layout B fade + Espandi overlay | 2 |
| Riduci in header | 2 |
| Conteggio + plurale / Senza stagione | 1 + 2 |
| Mobile stesso comportamento | 2 |
| Menu `⋯` Modifica/Elimina | 2 |
| Omettere colonna Stagione | 2 |
| count sotto 2 senza peek | 2 + 4 |
| Nessun persist / no DB | rispettato |
| Test helper + pagina | 1 + 4 |
