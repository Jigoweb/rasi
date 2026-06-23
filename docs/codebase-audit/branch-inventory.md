# Branch Inventory

Data: 2026-06-23
Regola: nessun branch viene cancellato, mergiato o ribasato senza approvazione esplicita.

## Definizioni Classificazione

- `keep`: active work or active worktree.
- `merge-candidate`: useful work not yet integrated.
- `archive`: old but possibly useful context.
- `delete-candidate`: merged or superseded and safe to delete after approval.

| Branch | Upstream | Stato | Ultimo commit | Worktree | Classificazione proposta | Decisione richiesta |
|---|---|---|---|---|---|---|
| `main` | `origin/main` | behind 1 | `33e4cd3 feat: add supabase realtime support` | `/Users/matteo/rasi` | `keep` | Base locale con worktree attiva; aggiornare separatamente se serve |
| `develop` | `origin/develop` | ahead 2 | `483761c docs: add emittenti format analysis and matching reliability plan` | no | `archive` | Review required: branch storico/divergente, non proposto per delete approval |
| `feat/individuazione-resume` | none | merged in `main` | `29db740 feat(individuazioni): resume interrupted process from where it stopped` | no | `delete-candidate` | Proporre delete approval esplicita: già mergeato in `main` |
| `feat/individuazione-resume-ux` | none | merged in `main` | `13d1e7b feat(individuazioni): surface interrupted jobs globally + resume from anywhere` | no | `delete-candidate` | Proporre delete approval esplicita: già mergeato in `main` |
| `feat/matching-reliability-optimization` | none | checked out in protected worktree | `2c9fec7 feat(mapping): wire MappingRulesEditor into MappingWizard (state, gate, validate, save)` | `.worktrees/matching-reliability` | `keep` | Worktree attiva, non toccare |
| `feat/codebase-cleanup-roadmap` | none | current branch | `33e4cd3 feat: add supabase realtime support` | `.worktrees/codebase-cleanup-roadmap` | `keep` | Branch corrente per questa roadmap |
| `fix/individuazione-stuck-state` | none | merged in `main` | `71220ed fix(individuazioni): action badge shows 'Bloccato' when process stale` | no | `delete-candidate` | Proporre delete approval esplicita: già mergeato in `main` |
| `fix/resume-batch-timeout` | none | merged in `main` | `5bf473b fix(individuazioni): resume/batch query timeout on high-id campaigns` | no | `delete-candidate` | Proporre delete approval esplicita: già mergeato in `main` |

## Delete Approval Required

No branch is approved for deletion yet.

Candidate commands, disabled until explicit approval:

```bash
# git branch -d feat/individuazione-resume
# git branch -d feat/individuazione-resume-ux
# git branch -d fix/individuazione-stuck-state
# git branch -d fix/resume-batch-timeout
```

Use `git branch -D` only if the user explicitly approves force deletion for a named branch.

Approval must name each branch explicitly. A general cleanup intent is not enough authorization to delete any branch.

## Review Required

- `develop`: merged into local `main` according to `git branch --merged main`, but retained as `archive` because it is a long-lived branch with upstream divergence noted in the inventory.

## Comandi Per Verifica Manuale

```bash
git branch -vv
git log --oneline --decorate --graph --all -n 60
git branch --merged main
git branch --no-merged main
```

## Note

- Le classificazioni sono proposte operative, non autorizzazioni alla cancellazione.
- Ogni delete richiede una conferma separata con nome branch esplicito.
- Le worktree attive sono protette.
