# UX Profilo Artista Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish `/dashboard/profilo`, show societari/notes/empty states, and enable inline self-edit of anagrafica/contatti with a whitelist payload.

**Architecture:** Pure helpers for payload + validation; extract `ProfiloDatiTab` for view/edit; evolve the existing profilo page for header/tabs/other tabs polish. Reuse `updateArtista`.

**Tech Stack:** Next.js client components, Jest, Supabase client, existing shadcn UI.

## Global Constraints

- Whitelist only: nome, cognome, nome_arte, codice_fiscale, data_nascita, luogo_nascita, tipologia, contatti, indirizzo.
- Societari RO; mandato/IPN/IMDB RO.
- Merge JSON contatti/indirizzo with existing objects.
- No repertorio search; no RLS migrations.

## File Structure

| File | Responsibility |
|---|---|
| `src/features/artisti/lib/artista-self-update.ts` | whitelist + validation |
| `src/features/artisti/lib/artista-self-update.test.ts` | unit tests |
| `src/app/dashboard/profilo/components/profilo-dati-tab.tsx` | view/edit dati personali |
| `src/app/dashboard/profilo/page.tsx` | shell: header, tabs, other tabs polish |

---

### Task 1: Helper whitelist + validazione

**Files:**
- Create: `src/features/artisti/lib/artista-self-update.ts`
- Test: `src/features/artisti/lib/artista-self-update.test.ts`

**Interfaces:**
- Produces:
  - `ArtistaSelfUpdateForm` type
  - `validateArtistaSelfUpdate(form): { ok: true } | { ok: false; error: string }`
  - `buildArtistaSelfUpdatePayload(form, existing?): Update payload` (merge contatti/indirizzo)

- [ ] Write failing tests
- [ ] Implement helper
- [ ] Tests pass; commit

---

### Task 2: ProfiloDatiTab view + edit inline

**Files:**
- Create: `src/app/dashboard/profilo/components/profilo-dati-tab.tsx`
- Modify: `src/app/dashboard/profilo/page.tsx` (wire tab + updateArtista)

- [ ] Implement view with societari card
- [ ] Implement edit mode + save/cancel via helpers
- [ ] Commit

---

### Task 3: Polish shell (header, tabs, empty, note repertorio)

**Files:**
- Modify: `src/app/dashboard/profilo/page.tsx`

- [ ] Header polish + scrollable tabs
- [ ] EmptyState helper; note column on repertorio
- [ ] Commit; push; update PR if possible
