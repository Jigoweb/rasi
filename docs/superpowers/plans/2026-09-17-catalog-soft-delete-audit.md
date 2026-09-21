# Catalog soft delete + audit implementation plan

> Executed 2026-09-17 after design approval.

**Goal:** Soft delete and append-only audit for opere, episodi, partecipazioni.

**Architecture:** Tombstone columns + `catalog_audit_log` + writer RPC. Matching and KPI skip tombstones. Individuazioni stay.

See `docs/superpowers/specs/2026-09-17-catalog-soft-delete-audit-design.md`.
