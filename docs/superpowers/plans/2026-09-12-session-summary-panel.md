# Session Summary Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Codex-style top-bar entry that opens a unified, real-data session summary workspace in Aino's existing right rail without changing the chat layout or duplicating feature logic.

**Architecture:** Register `summary` as a normal right-side layout-tree pane, backed by a small persistent `$summaryOpen` store and the same visibility binding used by Review. Render a thin summary shell through the existing contrib wiring, with independently subscribed sections that read current session, review/Git, subagent, context, preview, and hardware stores. Reuse existing facades/actions for Git operations and existing formatters/queries for context and resources.

**Tech Stack:** Electron desktop, React, TypeScript, Nanostores, TanStack React Query, existing Aino UI primitives and i18n catalogs, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-12-session-summary-panel-design.md`

## Global Constraints

- The summary is an auxiliary workspace: do not change the layout tree, squeeze the chat area, steal focus, or open automatically from background events.
- Use existing renderer stores, React Query data, and the typed Electron/remote Git facade; add no backend RPC.
- Keep state with its authority and clear session-scoped data on session/workspace changes; stale async responses must not paint a newer session.
- Reuse existing `Button`, `Tip`, `Loader`, `ErrorState`, `AinoDesignIcon`, `Codicon`, CSS tokens, and shared formatting helpers; do not introduce raw colors or bespoke SVGs.
- All visible copy, tooltip, and aria labels must be added to `i18n/types.ts`, `i18n/en.ts`, and `i18n/zh.ts`; internal ids and slash commands remain English.
- Tests must be run with `scripts/run_tests.sh` for repository tests and `npx vitest` from `apps/desktop` for the desktop suite.

### Task 1: Add Summary Pane State and Layout Registration

**Files:**
- Create: `apps/desktop/src/store/summary.ts`
- Modify: `apps/desktop/src/app/contrib/controller.tsx: registry pane list and visibility bindings`
- Modify: `apps/desktop/src/app/contrib/panes.tsx: right-side pane content export`
- Modify: `apps/desktop/src/app/contrib/surfaces.tsx: WiringApi-backed pane surface`
- Modify: `apps/desktop/src/app/contrib/types.ts: WiringApi`
- Modify: `apps/desktop/src/app/contrib/wiring.tsx: summary node and API publication`
- Test: `apps/desktop/src/store/summary.test.ts`

**Interfaces:**
- Produces `SUMMARY_PANE_ID`, `$summaryOpen`, `openSummary()`, `closeSummary()`, and `toggleSummary()` from `store/summary.ts`.
- Produces a `SummaryPaneContent` surface that accepts the stable `WiringActions['requestGateway']` callback and renders the summary component.
- Extends `WiringApi` with `summary: ReactNode`; `WiredPane part="summary"` becomes the only layout-tree mount.

- [ ] **Step 1: Write failing store tests.**

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { $summaryOpen, closeSummary, openSummary, toggleSummary } from './summary'

describe('summary pane state', () => {
  beforeEach(() => closeSummary())

  it('opens, closes, and toggles without affecting other pane state', () => {
    expect($summaryOpen.get()).toBe(false)
    openSummary()
    expect($summaryOpen.get()).toBe(true)
    toggleSummary()
    expect($summaryOpen.get()).toBe(false)
    toggleSummary()
    expect($summaryOpen.get()).toBe(true)
    closeSummary()
    expect($summaryOpen.get()).toBe(false)
  })
})
```

- [ ] **Step 2: Run the focused test and verify the missing-module failure.**

Run: `cd apps/desktop && npx vitest run src/store/summary.test.ts`

Expected: FAIL because `src/store/summary.ts` does not exist yet.

- [ ] **Step 3: Implement the minimal persistent pane store.**

Define `SUMMARY_PANE_ID = 'summary'`, persist the boolean under `hermes.desktop.summaryOpen` with `persistentAtom` and `Codecs.bool`, and make the three actions only update `$summaryOpen`. Do not call layout-tree APIs from the store; visibility binding owns tree synchronization.

- [ ] **Step 4: Register the pane and bind it to the tree.**

In `controller.tsx`, add a `summary` pane with `placement: 'right'`, `collapsible: true`, `revealAliases: [SUMMARY_PANE_ID]`, and the existing file-browser width/min/max tokens. Bind it with `bindPaneVisibility('summary', $summaryOpen, closeSummary, openSummary)` so tree reveals and titlebar toggles stay synchronized. Add `SummaryPaneContent` to `panes.tsx`, add `summary` to `WiringApi`, create the summary node in `wiring.tsx`, and register `render: () => idle(<WiredPane part="summary" />)` in the pane list.

- [ ] **Step 5: Run store, tree, and type tests.**

Run: `cd apps/desktop && npx vitest run src/store/summary.test.ts src/app/contrib/terminal-layout.test.ts`

Expected: PASS; existing pane layout tests remain green and the new pane is reachable through the same tree visibility binding as Review.

- [ ] **Step 6: Commit the state/layout slice.**

```bash
git add apps/desktop/src/store/summary.ts apps/desktop/src/store/summary.test.ts apps/desktop/src/app/contrib/controller.tsx apps/desktop/src/app/contrib/panes.tsx apps/desktop/src/app/contrib/surfaces.tsx apps/desktop/src/app/contrib/types.ts apps/desktop/src/app/contrib/wiring.tsx
git commit -m "feat(desktop): register session summary pane"
```

### Task 2: Add Summary Shell and Shared Section States

**Files:**
- Create: `apps/desktop/src/app/right-sidebar/summary/index.tsx`
- Create: `apps/desktop/src/app/right-sidebar/summary/summary-section.tsx`
- Create: `apps/desktop/src/app/right-sidebar/summary/summary.test.tsx`
- Modify: `apps/desktop/src/app/contrib/panes.tsx: SummaryPaneContent`

**Interfaces:**
- `SummaryPane` props: `{ requestGateway: GatewayRequester }`.
- `SummarySection` props: `{ title: string; icon: LucideIcon; children: ReactNode; state?: 'ready' | 'loading' | 'empty' | 'error'; error?: string; onRetry?: () => void }`.
- `SummaryPane` renders an accessible `aside[data-slot="summary-pane"]` with a close button and ordered section slots; it does not fetch data itself except through section hooks.

- [ ] **Step 1: Write component tests for shell behavior and terminal states.**

```tsx
it('renders title, close button, and stable section headings', () => {
  render(<SummaryPane requestGateway={vi.fn()} />)
  expect(screen.getByRole('complementary', { name: 'Session summary' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Close summary' })).toBeInTheDocument()
})

it('shows an error retry action without replacing the entire pane', () => {
  render(<SummarySection icon={Activity} state="error" title="System resources" error="Unavailable" onRetry={retry} />)
  expect(screen.getByText('Unavailable')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(retry).toHaveBeenCalledOnce()
})
```

- [ ] **Step 2: Run the tests and confirm they fail before implementation.**

Run: `cd apps/desktop && npx vitest run src/app/right-sidebar/summary/summary.test.tsx`

Expected: FAIL because the summary components and i18n keys are not defined.

- [ ] **Step 3: Implement the shared section primitive.**

Use existing section-header, tokenized text, `Loader`, `ErrorState`, `Button`, `Tip`, and `Codicon`/Lucide conventions. Keep sections flat with a single hairline separator and expose `data-slot="summary-section"` and `data-state` for tests. Error and loading states must terminate visibly and never render an unbounded spinner.

- [ ] **Step 4: Implement the shell and pane close action.**

Render the title/header, close button calling `closeSummary`, scrollable body, and placeholders for the seven sections in the spec order. The component must not navigate or focus on mount. Pass `requestGateway` from `SummaryPaneContent` to the context section.

- [ ] **Step 5: Run the component tests.**

Run: `cd apps/desktop && npx vitest run src/app/right-sidebar/summary/summary.test.tsx`

Expected: PASS for shell, close action, and section state behavior.

- [ ] **Step 6: Commit the shell slice.**

```bash
git add apps/desktop/src/app/right-sidebar/summary apps/desktop/src/app/contrib/panes.tsx
git commit -m "feat(desktop): add summary pane shell"
```

### Task 3: Implement Environment, Context, Sources, and Resources Sections

**Files:**
- Create: `apps/desktop/src/app/right-sidebar/summary/environment-section.tsx`
- Create: `apps/desktop/src/app/right-sidebar/summary/context-section.tsx`
- Create: `apps/desktop/src/app/right-sidebar/summary/sources-section.tsx`
- Create: `apps/desktop/src/app/right-sidebar/summary/resources-section.tsx`
- Create: `apps/desktop/src/app/right-sidebar/summary/summary-data.ts`
- Create: `apps/desktop/src/app/right-sidebar/summary/summary-data.test.ts`
- Modify: `apps/desktop/src/app/right-sidebar/summary/index.tsx`
- Modify: `apps/desktop/src/app/shell/hooks/use-context-breakdown.ts: export/reuse existing hook only if required`
- Modify: `apps/desktop/src/app/settings/system-resources-settings.tsx: extract shared hardware formatter/query helper if needed`

**Interfaces:**
- `summary-data.ts` exports pure `formatSummaryPath`, `summaryEnvironmentState`, `hardwareMeters`, and `sourceItems` helpers. These take data as arguments and never read source files.
- `EnvironmentSection` reads `$currentCwd`, `$workspaceCwdOwner`, `$selectedStoredSessionId`, `$currentModel`, `$currentProvider`, `$currentBranch`, `$gatewayState`, and `$activeGatewayProfile`.
- `ContextSection` accepts `{ requestGateway: GatewayRequester }`, reads `$currentUsage`, `$activeSessionId`, `$busy`, and uses `useContextBreakdown` keyed to the active runtime session.
- `ResourcesSection` uses the same `getLocalHardware` query key and 5-second viewed refresh policy as settings, with section-local loading/error state.

- [ ] **Step 1: Write pure data-contract tests.**

```ts
it('does not expose a previous workspace while ownership is changing', () => {
  expect(summaryEnvironmentState({ cwd: '/old', cwdOwner: 'old', selectedSession: 'new' })).toEqual({ kind: 'empty' })
})

it('keeps unavailable hardware distinct from zero usage', () => {
  expect(hardwareMeters(null)).toEqual({ kind: 'unavailable' })
  expect(hardwareMeters({ ram_total_bytes: 0, ram_available_bytes: 0 })).toEqual({ kind: 'ready', ramPercent: null })
})
```

- [ ] **Step 2: Run the data tests and verify they fail.**

Run: `cd apps/desktop && npx vitest run src/app/right-sidebar/summary/summary-data.test.ts`

Expected: FAIL because the pure helpers are not present.

- [ ] **Step 3: Extract only reusable format/query logic.**

Move hardware byte/percentage formatting into a small helper beside the summary feature, then update settings to consume that helper if extraction is needed. Keep `getLocalHardware`, query key, `retry: false`, and `useViewedInterval` behavior unchanged. Reuse `ContextUsagePanel` presentation data and `useContextBreakdown`; do not issue a new backend endpoint.

- [ ] **Step 4: Implement the four sections.**

Environment shows project/workdir, model/provider, profile, branch, and connection status; it shows a no-project state when cwd ownership does not match the selected session. Context renders the existing usage bar/summary with an explicit no-data state. Sources maps `$previewStatusBySession` for the selected stored id and calls `openPreview` only on click. Resources renders RAM/GPU meters and retryable errors without blocking the other sections.

- [ ] **Step 5: Compose the sections and test state isolation.**

Add the four sections to `SummaryPane` in the spec order. Assert that a resource query error still leaves environment/context/sources rendered and that changing the selected session removes the old source list before the new data arrives.

Run: `cd apps/desktop && npx vitest run src/app/right-sidebar/summary/summary-data.test.ts src/app/right-sidebar/summary/summary.test.tsx src/app/shell/context-usage-panel.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the read-only data slice.**

```bash
git add apps/desktop/src/app/right-sidebar/summary apps/desktop/src/app/shell/hooks/use-context-breakdown.ts apps/desktop/src/app/settings/system-resources-settings.tsx
git commit -m "feat(desktop): show session summary context and resources"
```

### Task 4: Implement Git Changes, Git Status, and Subagent Sections

**Files:**
- Create: `apps/desktop/src/app/right-sidebar/summary/changes-section.tsx`
- Create: `apps/desktop/src/app/right-sidebar/summary/git-section.tsx`
- Create: `apps/desktop/src/app/right-sidebar/summary/agents-section.tsx`
- Create: `apps/desktop/src/app/right-sidebar/summary/git-summary.ts`
- Create: `apps/desktop/src/app/right-sidebar/summary/git-summary.test.ts`
- Modify: `apps/desktop/src/app/right-sidebar/summary/index.tsx`

**Interfaces:**
- `git-summary.ts` exports `summarizeReviewFiles(files: readonly HermesReviewFile[])` and `summaryGitState(status: HermesRepoStatus | null, ship: HermesReviewShipInfo)`.
- `ChangesSection` reads `$reviewFiles`, `$reviewLoading`, `$reviewIsRepo`, `$reviewShipBusy`, and calls existing `stageReviewFile`, `unstageReviewFile`, `requestRevert`, `openReview`, and `refreshReview` actions.
- `GitSection` reads current branch/session state and uses `desktopGit().repoStatus`, `desktopGit().review.shipInfo`, and `desktopGit().review.push` through a bounded query/action layer keyed by repo cwd and connection/profile.
- `AgentsSection` reads `$subagents` and navigates to the existing Agents route only when the user clicks “View all”.

- [ ] **Step 1: Write contract tests for review aggregation and Git degradation.**

```ts
it('aggregates file and line counts without losing staged state', () => {
  expect(summarizeReviewFiles([
    { path: 'a.ts', added: 3, removed: 1, staged: true },
    { path: 'b.ts', added: 0, removed: 2, staged: false }
  ])).toEqual({ files: 2, added: 3, removed: 3, staged: 1 })
})

it('reports Git unavailable separately from a clean repository', () => {
  expect(summaryGitState(null, { ghReady: false, pr: null })).toEqual({ kind: 'unavailable' })
  expect(
    summaryGitState(
      {
        branch: 'main', defaultBranch: 'main', detached: false, ahead: 0, behind: 0,
        staged: 0, unstaged: 0, untracked: 0, conflicted: 0, changed: 0,
        added: 0, removed: 0, files: []
      },
      { ghReady: false, pr: null }
    ).kind
  ).toBe('clean')
})
```

- [ ] **Step 2: Run focused tests and confirm the red state.**

Run: `cd apps/desktop && npx vitest run src/app/right-sidebar/summary/git-summary.test.ts`

Expected: FAIL because the aggregation and Git-state helpers are not defined.

- [ ] **Step 3: Implement pure review/Git summaries and bounded reads.**

Use the existing review store as the authority for changed files and mutations. For branch/remote/PR metadata, query through `desktopGit()` so remote sessions use the remote facade; use the existing `review.revParse(cwd, 'HEAD')` call for the abbreviated recent-commit SHA rather than adding a log endpoint. Key requests by active connection/profile and cwd, increment a request sequence or use query cancellation, and ignore results whose cwd no longer matches. A missing bridge/repository resolves to a visible unavailable state; it must not become an empty clean state.

- [ ] **Step 4: Implement actions and section UI.**

Changes shows file/line totals, “View diff”, stage/unstage, revert, and refresh affordances using existing labels and confirmation behavior. Git shows branch, tracking/PR state, latest commit if available, and a retryable push action through the existing review facade. Agents shows running/completed/failed counts and the existing Agents navigation action; it does not duplicate the Agents list.

- [ ] **Step 5: Add component tests for actions and failure isolation.**

Mock only the typed facades/stores at their boundary. Assert that clicking stage/revert/push calls the existing action, that a failed Git request exposes retry, and that Agents navigation uses the current route without opening a new overlay automatically.

Run: `cd apps/desktop && npx vitest run src/app/right-sidebar/summary src/app/right-sidebar/review src/store/subagents*`

Expected: PASS.

- [ ] **Step 6: Commit the Git/Agents slice.**

```bash
git add apps/desktop/src/app/right-sidebar/summary
git commit -m "feat(desktop): add Git and agent summary sections"
```

### Task 5: Add Titlebar Entry, i18n, Accessibility, and Regression Tests

**Files:**
- Modify: `apps/desktop/src/app/shell/titlebar-controls.tsx: static system tools`
- Modify: `apps/desktop/src/app/contrib/wiring.tsx: system tool width count`
- Modify: `apps/desktop/src/app/shell/titlebar-controls.test.tsx`
- Modify: `apps/desktop/src/i18n/types.ts`
- Modify: `apps/desktop/src/i18n/en.ts`
- Modify: `apps/desktop/src/i18n/zh.ts`
- Modify: `apps/desktop/src/i18n/coverage.test.ts`
- Modify: `apps/desktop/src/app/right-sidebar/summary/summary.test.tsx`

**Interfaces:**
- The titlebar tool uses id `summary`, label `t.titlebar.sessionSummary`, active `$summaryOpen`, and `toggleSummary()` with `triggerHaptic('tap')`.
- Add a typed `t.summary` namespace for section titles, empty/loading/error copy, actions, and aria labels. Keep all internal identifiers English.

- [ ] **Step 1: Add failing titlebar and locale coverage assertions.**

```tsx
it('exposes the summary toggle and reflects its open state', () => {
  render(<TitlebarControls />)
  const button = screen.getByRole('button', { name: 'Session summary' })
  fireEvent.click(button)
  expect(button).toHaveAttribute('aria-pressed', 'true')
})
```

Add a locale test asserting the Chinese catalog has non-English Han copy for the summary title and each section label, while `findMissingLeaves(en, zh)` remains empty.

- [ ] **Step 2: Run the focused tests and verify the red state.**

Run: `cd apps/desktop && npx vitest run src/app/shell/titlebar-controls.test.tsx src/i18n/coverage.test.ts`

Expected: FAIL because the titlebar tool and translation leaves are absent.

- [ ] **Step 3: Implement the titlebar toggle and update chrome sizing.**

Add the summary tool to `systemTools`, alongside existing layout/HUD/haptics/terminal controls. Hide it on route-blocking surfaces through the existing guard. Read the real tree/summary state for active semantics and increment the `SYSTEM_TOOL_COUNT` used by `titlebarToolsWidth` so pane controls do not overlap the new icon.

- [ ] **Step 4: Add all locale keys and accessible labels.**

Extend the i18n interface and English/Chinese catalogs for title, seven section names, loading/empty/unavailable/retry states, Git actions, source actions, and `aria-label`s. Use the existing `t.common.retry` where the type shape allows it; do not hardcode visible text in JSX.

- [ ] **Step 5: Run titlebar, locale, and summary tests.**

Run: `cd apps/desktop && npx vitest run src/app/shell/titlebar-controls.test.tsx src/app/right-sidebar/summary src/i18n/coverage.test.ts src/i18n/runtime.test.ts`

Expected: PASS with no missing locale leaves and correct `aria-pressed` behavior.

- [ ] **Step 6: Commit the interaction and localization slice.**

```bash
git add apps/desktop/src/app/shell/titlebar-controls.tsx apps/desktop/src/app/contrib/wiring.tsx apps/desktop/src/app/shell/titlebar-controls.test.tsx apps/desktop/src/app/right-sidebar/summary apps/desktop/src/i18n/types.ts apps/desktop/src/i18n/en.ts apps/desktop/src/i18n/zh.ts apps/desktop/src/i18n/coverage.test.ts
git commit -m "feat(desktop): expose localized session summary toggle"
```

### Task 6: Full Verification and Desktop Acceptance

**Files:**
- Modify only files required by failing tests from Tasks 1–5; do not include generated build output, install stamps, screenshots, or temporary files.
- Test: existing desktop Vitest files plus repository runner output.

**Interfaces:**
- No new public API beyond the local summary pane store and `WiringApi.summary`.

- [ ] **Step 1: Run the focused desktop suite from a clean working tree.**

Run:

```bash
cd apps/desktop
npx vitest run src/app/right-sidebar/summary src/app/shell/titlebar-controls.test.tsx src/app/shell/context-usage-panel.test.tsx src/app/contrib/terminal-layout.test.ts
npx tsc --noEmit
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 2: Run repository-required tests for changed JS/TS paths.**

Run: `scripts/run_tests.sh`

Expected: the runner completes successfully or reports only pre-existing failures, which must be recorded with their file and error before proceeding.

- [ ] **Step 3: Exercise the desktop manually.**

Start the desktop development app using the repository's existing command. Verify: summary opens from the top button; it closes without changing the selected session; it respects right-rail width and pane flipping; no-project and remote sessions do not read local files; clean/unavailable Git states terminate; changing sessions removes old data; stage/revert/push call the existing flows; sources open only after clicking; and terminal/preview state survives hiding and reopening.

- [ ] **Step 4: Inspect the final diff and generated-file hygiene.**

Run `git diff --check`, `git status --short`, and `git diff --stat`. Remove no user files; only leave source, tests, i18n, and documentation changes belonging to this feature. Confirm no raw hex colors, hardcoded model/project/Git values, or source-reading tests were introduced.

- [ ] **Step 5: Commit the verified implementation.**

```bash
git add apps/desktop/src apps/desktop/package.json docs/superpowers/plans/2026-09-12-session-summary-panel.md
git commit -m "feat(desktop): complete unified session summary workspace"
```

- [ ] **Step 6: Report the branch and verification receipt.**

Report the implementation commits, tests run, any pre-existing failures, and the local desktop start command/URL. Do not merge into `main` or push unless separately requested.
