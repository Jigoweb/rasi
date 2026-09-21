# Soft delete e audit del catalogo

**Data:** 2026-09-17
**Stato:** Design approvato

## Problema

La cancellazione di opere, episodi e partecipazioni è un DELETE fisico. Non resta
lista delle rimosse, né storico degli aggiornamenti. Se ci sono individuazioni, l’UI
le elimina per sbloccare il FK `RESTRICT`.

## Obiettivo

Mantenere storicità del catalogo: tombstone sulle righe, registro append-only di
insert/update/soft-delete/restore. Le individuazioni già scritte restano. Il matching
futuro ignora il catalogo rimosso.

## Decisioni

1. **Scope:** `opere`, `episodi`, `partecipazioni`. Non artisti.
2. **Modello:** `deleted_at` / `deleted_by` / `deleted_cascade_from` + tabella
   `catalog_audit_log`.
3. **UNIQUE** invariati (valgono anche sulle rimosse). Ricreare la stessa chiave
   naturale riattiva la riga.
4. **Restore del padre** ripristina solo i figli con `deleted_cascade_from` uguale
   all’id del padre.
5. **Niente DELETE** via client (policy RLS). Operazioni da RPC.
6. **Report individuazioni:** JOIN anche sulle rimosse. Matcher e liste: solo attive.

## Fuori scope

Artisti, hard-delete admin, recupero delle opere già cancellate prima di questa
migrazione, snapshot versionale per ogni update.
