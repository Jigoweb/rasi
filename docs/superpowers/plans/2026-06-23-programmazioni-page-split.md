# Programmazioni Page Split Plan

Goal: reduce route-page complexity without changing behavior.

## Decisions Applied

- UI namespace migration is out of scope; keep current imports stable.
- Individuazione workflow changes are out of scope.
- This is a planning task only; no source refactor is performed here.
- Behavior changes are out of scope; every future slice should preserve existing labels, disabled states, navigation, data loading, upload behavior, dialog flow, and error handling.
- Branch cleanup is out of scope; do not merge, rebase, delete branches, or remove files as part of this plan.

## Inspections Run

- Searched the page structure with:
  - `rg "useState|useEffect|function |const .* = \\(|return \\(" src/app/dashboard/programmazioni/page.tsx`
- Read `src/app/dashboard/programmazioni/page.tsx` in slices covering imports/state, handlers/effects, programmazioni render, emittenti render, upload/delete dialogs, and individuazioni dialog.
- Checked `package.json` scripts to confirm available verification commands.
- Looked for nearby `*.test.*` / `*.spec.*` files referencing tests and found no existing matching tests in the worktree.

## Current Responsibilities

- Data loading for campagne programmazione via `getCampagneProgrammazione()`.
- Direct Supabase data loading and mutations for emittenti.
- Local state for active tab, campaign filters, emittenti filters, selected entities, modal/dialog visibility, upload state, mapping wizard state, processing progress, artist filters, and delete confirmation state.
- Campaign creation form state and validation through `react-hook-form` and `zod`.
- File parsing for CSV/XLS/XLSX, upload decisioning, mapping wizard integration, upload batching, progress display, and upload error display.
- Individuazioni start/resume flow, including global process checks, stale progress display, artist filtering, and confirmation dialog.
- Delete-campaign confirmation flow, including delete-info loading, block handling, mutation, and post-delete list updates.
- Client-side derived data for filtered campagne, filtered emittenti, unique anni, unique emittenti, status labels, CSV export data, and formatted dates.
- Render sections for loading state, header, tab switcher, programmazioni filters, campaign desktop table, campaign mobile cards, emittenti filters/table/cards, emittenti detail/edit dialogs, new-programmazione/upload dialog, delete dialog, individuazioni dialog, process-blocked dialog, mapping wizard, and format-change warning dialog.

## First Slice

Extract the programmazioni filter card into a presentational component with no behavior change.

Proposed future file:

- `src/app/dashboard/programmazioni/components/ProgrammazioniFilters.tsx`

Why this is the safest first extraction:

- The section is mostly render-only and currently spans the search input, status/emittente/anno selects, reset button, filter chips, and result count.
- It can receive all values, derived options, and setters from the page as props.
- It does not need to own data fetching, upload state, individuazione state, routing, or mutations.
- It should preserve the current UI component imports from `@/shared/components/ui/*` and avoid any UI namespace migration.

Expected future props to confirm before implementation:

- `searchQuery`, `onSearchQueryChange`
- `debouncedSearchQuery`
- `statusFilter`, `onStatusFilterChange`
- `emittenteFilter`, `onEmittenteFilterChange`
- `annoFilter`, `onAnnoFilterChange`
- `uniqueEmittenti`
- `uniqueAnni`
- `filteredCount`
- `totalCount`
- `onResetFilters`

Implementation note for the future refactor: inspect the exact current setter usage immediately before editing, then move only the JSX for the filter card and its direct UI imports. Do not move `filterCampagne`, `uniqueAnni`, or `uniqueEmittenti` in the first slice.

## Future Refactor Tasks

### Task 1: Extract Programmazioni Filters

Create:

- `src/app/dashboard/programmazioni/components/ProgrammazioniFilters.tsx`

Modify in a future refactor:

- `src/app/dashboard/programmazioni/page.tsx`

Scope:

- Move only the programmazioni filter card JSX.
- Keep all filter state and derived options in the page.
- Keep labels, placeholder text, status values, reset behavior, and filter-chip behavior unchanged.

Verification for this task:

- Capture the lint baseline before editing, then compare lint output after the slice and fix only new lint errors in files touched by the slice.
- Run `npm run typecheck`.
- Manually verify `/dashboard/programmazioni`:
  - Search filters campaign name and emittente name after debounce.
  - Status, emittente, and anno filters still combine.
  - Filter chips clear the intended filter.
  - Reset clears search/status/emittente/anno.
  - Result count still shows filtered and total campaign counts.

### Task 2: Extract Campaign Status Display Helpers

Create:

- `src/app/dashboard/programmazioni/components/CampagnaStatusBadge.tsx`
- `src/app/dashboard/programmazioni/components/CampagnaProgressTooltip.tsx`

Modify in a future refactor:

- `src/app/dashboard/programmazioni/page.tsx`

Scope:

- Move status badge rendering and progress tooltip UI after the filter extraction is stable.
- Keep `isProcessingStale`, `processingProgressMap`, `loadingProgressMap`, `uploadProgress`, `deleteProgress`, and `fetchProcessingProgress` ownership in the page unless a later slice explicitly extracts a hook.
- Inspect the exact inline stale/progress conditions before implementation; do not simplify labels or progress math in this task.

Verification for this task:

- Capture the lint baseline before editing, then compare lint output after the slice and fix only new lint errors in files touched by the slice.
- Run `npm run typecheck`.
- Manually verify desktop table status rendering for `bozza`, `uploading`, `in_review`, `in_corso`, stale `in_corso`, `individuata`, `deleting`, and `error`.
- Manually verify the progress tooltip still lazy-loads detailed progress and still allows refresh without navigating the row.

### Task 3: Extract Campaign Table Rows

Create:

- `src/app/dashboard/programmazioni/components/ProgrammazioniTable.tsx`
- `src/app/dashboard/programmazioni/components/ProgrammazioneRow.tsx`
- `src/app/dashboard/programmazioni/components/ProgrammazioneMobileCard.tsx`

Modify in a future refactor:

- `src/app/dashboard/programmazioni/page.tsx`

Scope:

- Move the campaign desktop table and mobile card list after status/progress UI is isolated.
- Keep navigation and operation handlers supplied by the page as props.
- Preserve row click, Enter key navigation, action dropdown click propagation, upload CTA enablement, individuazioni CTA enablement, resume CTA enablement, and delete action behavior.

Verification for this task:

- Capture the lint baseline before editing, then compare lint output after the slice and fix only new lint errors in files touched by the slice.
- Run `npm run typecheck`.
- Manually verify desktop and mobile layouts.
- Manually verify row click and keyboard navigation to `/dashboard/programmazioni/[id]`.
- Manually verify action buttons do not trigger row navigation.

### Task 4: Extract Upload Dialog UI

Create:

- `src/app/dashboard/programmazioni/components/ProgrammazioneUploadDialog.tsx`

Modify in a future refactor:

- `src/app/dashboard/programmazioni/page.tsx`

Scope:

- Move only the new-programmazione/upload dialog JSX once table extraction is stable.
- Keep form setup, file parsing, mapping decision, upload batching, mapping wizard state, and upload mutations in the page for this task unless a separate hook extraction is planned.
- Inspect exact `react-hook-form`, `fileInputRef`, upload progress, and mapping wizard dependencies before implementation.

Verification for this task:

- Capture the lint baseline before editing, then compare lint output after the slice and fix only new lint errors in files touched by the slice.
- Run `npm run typecheck`.
- Manually verify creating a campaign still advances to upload step.
- Manually verify resuming upload from an existing campaign opens the upload step directly.
- Manually verify CSV/XLS/XLSX selection, mapping wizard open path, format-change warning path, upload progress, upload error display, close/reset behavior, and successful refresh.

### Task 5: Extract Emittenti Section Separately

Create:

- `src/app/dashboard/programmazioni/components/EmittentiSection.tsx`
- `src/app/dashboard/programmazioni/components/EmittenteDetailsDialog.tsx`
- `src/app/dashboard/programmazioni/components/EmittenteFormDialog.tsx`

Modify in a future refactor:

- `src/app/dashboard/programmazioni/page.tsx`

Scope:

- Split the emittenti tab after campaign-facing slices are complete.
- Keep Supabase reads/writes in the page or in a later dedicated hook; do not mix data-layer extraction into the first emittenti UI split.
- Preserve `EmittenteMappingSection` and `EmittenteMappingButton` usage and paths.

Verification for this task:

- Capture the lint baseline before editing, then compare lint output after the slice and fix only new lint errors in files touched by the slice.
- Run `npm run typecheck`.
- Manually verify tab switching, emittenti loading, search, detail dialog, create dialog, edit dialog, mapping button, and mapping section callback behavior.

## Tests And Checklist

Before any future source refactor:

- Capture current behavior manually on `/dashboard/programmazioni`.
- Note representative campaign statuses available in the local/dev dataset.
- Inspect the exact target JSX and handler dependencies immediately before editing.

After each future slice:

- Capture the current lint baseline before editing with `npm run lint` and save enough output to compare after the slice. The repository has a red global lint baseline, so do not require global lint to become green for each slice.
- After the slice, rerun `npm run lint` and fix only new lint errors in files touched by that slice. Pre-existing lint errors outside the slice are not part of the slice gate.
- Use `npm run typecheck`, relevant tests, and build as the primary green gates until the global lint baseline is triaged.
- Run `npm run typecheck`.
- Run `npm test` when tests exist or when the slice adds tests.
- For broader confidence, run `npm run build` after the table, upload dialog, or emittenti section extraction.

Manual route checklist:

- Loading state renders.
- Tab switch between "Campagne Programmazione" and "Emittenti" still loads the right data.
- Programmazioni filters and reset behavior work.
- Campaign desktop table and mobile cards preserve navigation and action behavior.
- CSV export still downloads filtered campaign data.
- New campaign flow still creates a campaign and moves to upload.
- Existing campaign upload flow still opens in upload mode.
- Mapping wizard and format-change warning still appear under the same conditions.
- Delete confirmation still blocks campaigns with linked individuazioni.
- Individuazioni confirmation still opens, loads artists, supports artist filtering, and starts/resumes through the existing workflow.
- Process-blocked dialog still appears when a global process prevents starting a new one.
- Emittenti search, create, edit, detail, and mapping access still work.

## Commands To Verify

Use the worktree path explicitly:

```bash
cd "/Users/matteo/rasi/.worktrees/codebase-cleanup-roadmap" && npm run lint
cd "/Users/matteo/rasi/.worktrees/codebase-cleanup-roadmap" && npm run typecheck
cd "/Users/matteo/rasi/.worktrees/codebase-cleanup-roadmap" && npm test
cd "/Users/matteo/rasi/.worktrees/codebase-cleanup-roadmap" && npm run build
```

Lint rule: use `npm run lint` to capture and compare the baseline, not as a required global-green gate. Until the global lint baseline is triaged, the required lint outcome for a slice is "no new lint errors in touched files"; the primary green gates are `npm run typecheck`, relevant tests, and `npm run build` for broader slices.

For this planning-only task, no verification command is expected to modify or validate application behavior because no source refactor is performed.

## Rollback Strategy

- Each future extraction should be a small, isolated commit or reviewable diff containing only the extracted component/hook and the page import/call-site update.
- If a slice has its own commit and verification fails, revert that single slice commit.
- If no commit exists, reverse only the scoped diff for files touched by that slice. Use `git diff -- <touched-files>` to identify the exact changes, then undo those edits manually or with a targeted patch.
- Avoid broad resets, checkout of unrelated paths, branch rewrites, or workspace-wide cleanup. Do not discard unrelated user or branch changes.
- After rollback, rerun the same slice verification: lint comparison for touched files, `npm run typecheck`, relevant tests, and build when applicable.
- Keep source behavior stable by avoiding mixed changes: do not combine UI extraction with workflow changes, data-loading changes, import namespace migration, styling redesign, or branch cleanup.
- For the first slice specifically, rollback is straightforward: remove only `ProgrammazioniFilters.tsx`, restore the filter card JSX inline in `src/app/dashboard/programmazioni/page.tsx`, compare lint output for those touched files, and rerun typecheck.

## Out Of Scope

- UI namespace migration.
- Individuazione workflow changes, including worker/serverless fallback behavior and legacy removal.
- Behavior changes of any kind.
- Data-model, Supabase, or service changes.
- Test framework migration.
- Styling redesign.
- Branch cleanup, branch deletion, merge, or rebase.
