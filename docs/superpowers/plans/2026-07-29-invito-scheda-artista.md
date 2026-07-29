# Invito Scheda Artista Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrare stato accesso portale e azioni Invita/Reinvia nell’header di `/dashboard/artisti/[id]`.

**Architecture:** Helper puro per lo stato; estendere `GET /api/users?artista_id=`; componente header che riusa `POST /api/users` per invite/resend.

**Tech Stack:** Next.js App Router, Jest, Supabase Auth Admin API, shadcn UI.

## Global Constraints

- Solo scheda dettaglio; admin/operatore.
- Stati: non_invitato | in_attesa | attivo.
- Email precompilata da contatti, modificabile; riuso POST invite esistenti.
- Lookup server-side per artista_id (non lista completa in browser).

## File Structure

| File | Responsibility |
|---|---|
| `src/features/artisti/lib/artista-invite-status.ts` | derive status |
| `src/features/artisti/lib/artista-invite-status.test.ts` | unit tests |
| `src/app/api/users/find-by-artista.ts` | find user by artista_id among list |
| `src/app/api/users/find-by-artista.test.ts` | unit tests |
| `src/app/api/users/route.ts` | GET branch on `artista_id` query |
| `src/app/dashboard/artisti/[id]/components/artista-invite-header.tsx` | UI badge + dialog + actions |
| `src/app/dashboard/artisti/[id]/page.tsx` | wire header |

---

### Task 1: deriveArtistaInviteStatus

- [ ] Failing tests + implement + commit

### Task 2: GET ?artista_id= + find helper

- [ ] Failing tests for find + update GET + commit

### Task 3: ArtistaInviteHeader UI + wire page

- [ ] Component + integrate in page header + commit + push + update PR
