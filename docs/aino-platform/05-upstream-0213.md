# Hermes 0.21.3 Integration

Validation date: 2026-09-18 (Asia/Shanghai).

## Source

| Item | Revision |
| --- | --- |
| Aino parent | `23301518fcf54ba74be9ebf5c0dfd560f3bf154a` |
| Upstream release | Hermes Agent `0.21.3`, tag `v2026.9.14` |
| Upstream parent | `345cd2b057a452236de401d3534b8502a7465e8d` |
| Previous upstream baseline | `2237be355906fbe6065ce1815711eee52b2d646e` (`0.21.1`) |
| Integration branch | `codex/aino-upstream-v0213` |
| Active Aino branch | `codex/aino-platform-identity-models-billing` |

This is a merge of the release tag, preserving upstream ancestry. It does not
track unreleased upstream `main`. Python, CLI and desktop package versions are
`0.21.3`.

## Aino Compatibility

- Retain Aino branding, application identity, `.aino` data isolation and the
  fetch-only upstream remote.
- Retain platform account authority in Electron, model lease ownership,
  per-account billing, and the explicitly enabled legacy development adapter.
- Retain the fixed Light/Dark/System palette, full-page Settings, persistent
  summary panel, terminal workspace, and draft/session navigation behavior.
- Reconcile upstream transport fanout with managed-session ownership: ordinary
  viewers can query model options; becoming a managed owner retires viewers;
  managed runtime tickets still require the exact owner.
- Extend the project-tree RPC contract with session identities emitted by the
  real backend, including identities beyond the preview limit. Regenerate the
  TypeScript and OpenRPC declarations.
- Update imports for upstream module moves, including reply metrics and native
  test fixtures.

Native validation exposed two additional account defects. Resource errors used
to increment the account revision, invalidating the model catalog and triggering
an unbounded reload loop. They now return to the resource caller without
publishing a new account state; transitions to offline or reauthentication still
publish, and generation/ownership guards remain intact. A real HTTP regression
was observed failing before the fix and passing after it.

The legacy development login previously queried `account.status` after receiving
a connection descriptor but before the WebSocket opened. It now waits for the
gateway to become ready. Platform authentication remains independent of gateway
availability. The gateway-routing regression was also verified before and after
the fix.

## Verification

The broad runs below were followed by focused reruns for every observed failure.
They are recorded separately rather than described as a fresh all-green full
suite. Counts across rows overlap and must not be added together.

| Check | Result |
| --- | --- |
| Python agent/CLI/plugins, 2,024 files | 22,916 passed, 16 failed, 237 skipped; one additional file timed out |
| Python state suite, 112 files | 1,249 passed, 55 skipped |
| Python updater/provider selection | 44 passed, 14 skipped |
| Full desktop renderer suite | 8,271 passed, 1 stale translation assertion failed |
| Full Electron suite | 2,341 passed, 6 skipped |
| Platform Electron regression after account fix | 103 passed |
| Account/model renderer regression after startup fix | 31 passed |
| Codex Responses and autostash final rerun | 93 passed |
| Other Python failure files, final rerun | 15 passed, 3 Windows-only cases skipped |
| Translation assertion, final rerun | 23 passed |
| Native platform account flow | 1 passed |
| Native chat flows, final rerun | 5 passed |
| TypeScript: renderer, Electron, E2E | Passed with `--noEmit` |
| Full desktop lint | 0 errors, 216 warnings; final changed-file lint also checked |
| Desktop production build | Passed |

Python failure closure:

- Install the pinned ACP test dependency for the manual-compression surface test.
- Use real SQLite connection subclasses for FD tracking, preserving production
  connection factory behavior instead of wrapping away its identity.
- Isolate updater tests from the host's launchd, dashboard cleanup, dependency
  installation and TCC anchor. Production updater logic is unchanged.
- Mark Windows-only cases for Windows CI rather than impersonating Windows on
  macOS.
- Isolate Codex stream tests from live model catalog discovery; the formerly
  timed-out file completes with 63 tests passing.

The renderer assertion now compares translation output with its locale catalog,
so legitimate upstream wording changes do not break the behavior contract.

Native tests use isolated temporary account/runtime data, the real Electron
bridge and Python backend, plus loopback platform and inference fixtures. The
account flow covers login while the backend is unavailable, authenticated
workspace startup, a second window, the account/wallet view, logout propagation
and fresh authentication after restart. Chat coverage includes sending, session
search/resume, composer layout and busy/queued controls.

Native fixture commands (from `apps/desktop`):

```sh
npm run build
node scripts/bundle-electron-main.mjs --dev
npx playwright test e2e/platform-account.spec.ts e2e/chat.spec.ts --workers=1 --reporter=list
```

The development bundle is required for isolated loopback platform origins and
the opt-in legacy adapter; packaged production guards remain enabled in the
production bundle. Restore a production build after native fixture testing.

The chat screenshot was generated and inspected; no visual comparison baseline
was available, so this does not claim a pixel-diff baseline pass. Stale native
assertions were updated to verify hidden unsent titles, restored conversation
titles and the actual voice-menu toggle while preserving search, layout and
queue/stop behavior checks.

Local evidence logs use `/private/tmp/aino-v0213-*.log`; native screenshots and
traces are under `apps/desktop/test-results/`. These are temporary local
artifacts, not repository fixtures. The merge also removes a conflict marker
already present in the upstream optional-skill catalog and whitespace reported
by `git diff --check`.

## Scope Limits

This update does not modify Aino-API or establish a new production API pairing.
Native coverage here uses test services, not live SMS, paid inference or payment
settlement. Windows/Linux execution, signing, notarization, packaged distribution
and production deployment are outside this update. Earlier delivery receipts
remain historical evidence for their recorded revisions.
