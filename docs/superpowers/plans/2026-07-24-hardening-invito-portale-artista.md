# Hardening Invito Portale Artista Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rimuovere i mock auth, consentire agli operatori di cambiare ruoli fino a operatore (mai admin) preservando metadata, e gestire errori callback con `/auth/link-errore`.

**Architecture:** Estrarre helper puri testabili per permessi/ruoli e destinazioni callback; usarli in `auth-context`, `PATCH /api/users`, UI utenti e route callback. Nessuna migrazione DB.

**Tech Stack:** Next.js App Router, TypeScript, Jest, Supabase Auth metadata.

## Global Constraints

- Ogni utente ha un ruolo in prodotto; metadata corrotti → fail-closed (`collecting`).
- Operatore: può assegnare `operatore` | `collecting` | `artista`; mai `admin`; non modifica utenti già `admin`.
- Merge metadata obbligatorio su cambio ruolo (preservare `artista_id`).
- Nessuna modifica RLS `ripartizioni` / UX profilo in questo slice.

## File Structure

| File | Responsibility |
|---|---|
| `src/shared/lib/auth-permissions.ts` | Helper puri: ruolo, permessi, assignable roles, canChangeRole, merge metadata |
| `src/shared/lib/auth-permissions.test.ts` | Test helper permessi |
| `src/shared/contexts/auth-context.tsx` | Usa helper; rimuove mock |
| `src/features/auth/lib/auth-callback.ts` | Destinazione successo/errore callback |
| `src/features/auth/lib/auth-callback.test.ts` | Test destinazioni |
| `src/app/auth/callback/route.ts` | Usa helper; gestisce errori exchange |
| `src/app/auth/link-errore/page.tsx` | Pagina errore invito/auth |
| `src/app/api/users/role-update.ts` | Logica validazione cambio ruolo + merge |
| `src/app/api/users/role-update.test.ts` | Test regole API |
| `src/app/api/users/route.ts` | PATCH usa role-update |
| `src/app/dashboard/utenti/page.tsx` | Select ruoli filtrato per operatore |

---

### Task 1: Helper permessi auth

**Files:**
- Create: `src/shared/lib/auth-permissions.ts`
- Test: `src/shared/lib/auth-permissions.test.ts`
- Modify: `src/shared/contexts/auth-context.tsx`

**Interfaces:**
- Produces:
  - `resolveUserRole(ruolo: unknown): UserRole` — invalid/null → `'collecting'`
  - `getRolePermissions(role: UserRole): { isAdmin, isOperatore, isArtista, canManageUsers, canEditRoles }`
  - `rolesAssignableBy(actorRole: UserRole): UserRole[]`
  - `canActorChangeTargetRole(actorRole, targetCurrentRole, newRole): { ok: true } | { ok: false; error: string }`
  - `mergeUserMetadataWithRole(existing: Record<string, unknown> | null | undefined, ruolo: UserRole): Record<string, unknown>`

- [ ] **Step 1: Write failing tests** for resolve, permissions matrix, assignable roles, canChange, merge

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- src/shared/lib/auth-permissions.test.ts --runInBand
```

- [ ] **Step 3: Implement `auth-permissions.ts`**

- [ ] **Step 4: Wire `auth-context.tsx`** — remove mocks; use helpers; default context zero privileges (`collecting`)

- [ ] **Step 5: Run tests — expect PASS; commit**

---

### Task 2: Validazione cambio ruolo API

**Files:**
- Create: `src/app/api/users/role-update.ts`
- Test: `src/app/api/users/role-update.test.ts`
- Modify: `src/app/api/users/route.ts` (PATCH)

**Interfaces:**
- Consumes: `canActorChangeTargetRole`, `mergeUserMetadataWithRole`, `resolveUserRole` from auth-permissions
- Produces: `validateRoleChange({ actorIsAdmin, actorUserId, targetUserId, targetCurrentRole, newRole })` e uso merge in PATCH

- [ ] **Step 1: Write failing tests** (admin ok; operatore ok non-admin; operatore→admin 403; operatore su admin 403; merge preserva artista_id; anti self-demote admin)

- [ ] **Step 2: Implement `role-update.ts` + update PATCH** to fetch target metadata, validate, merge

- [ ] **Step 3: Tests PASS; commit**

---

### Task 3: Callback + pagina link-errore

**Files:**
- Create: `src/features/auth/lib/auth-callback.ts`
- Test: `src/features/auth/lib/auth-callback.test.ts`
- Modify: `src/app/auth/callback/route.ts`
- Create: `src/app/auth/link-errore/page.tsx`

**Interfaces:**
- Produces:
  - `getAuthCallbackDestination({ origin, invite, success }): string`
  - Success invite → `/auth/imposta-password`
  - Success other → `/dashboard`
  - Fail invite → `/auth/link-errore?tipo=invito`
  - Fail other → `/auth/link-errore?tipo=auth`

- [ ] **Step 1: Failing tests destinazioni**

- [ ] **Step 2: Implement helper + callback route (check exchange error)**

- [ ] **Step 3: Create link-errore page** with copy per tipo + CTA `/auth`

- [ ] **Step 4: Tests PASS; commit**

---

### Task 4: UI utenti — limiti operatore

**Files:**
- Modify: `src/app/dashboard/utenti/page.tsx`
- Optionally extract small helper usage of `rolesAssignableBy` / hide Modifica Ruolo on admin targets for operatori

- [ ] **Step 1: Filter role options with `rolesAssignableBy(userRole)`**
- [ ] **Step 2: Hide/disable role edit for operatori when target.ruolo === 'admin'`**
- [ ] **Step 3: Commit**

---

### Task 5: Verifica finale

- [ ] Run targeted tests for all new files
- [ ] Push branch; update PR body
