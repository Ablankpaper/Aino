# B6 capability and recovery implementation report

## Checkpoint 1 — exact gateway capability gate

Status: complete, committed, ready for immutable review.

Commit: `911151ea092f294593ad72fe9c4676f65103d6ca` (`fix(desktop): gate managed models by exact gateway capability`). Parent/base immediately before this checkpoint: `d0e248b7587c035d6546677ff317ea96941d6b4a`.

Implemented:

- Added a topical renderer store retaining `gateway.ready.managed_model_binding === 1` evidence by exact registry connection/profile route. A missing field in a delivered ready frame is authoritative unsupported evidence; a merely open socket is not evidence.
- Primary and secondary socket subscribers record ready evidence at their closure/published owner boundary. Raw wire profile/connection fields are not trusted for ownership.
- `connecting`, `closed`, and `error` invalidate evidence. Replacing a primary owner and material secondary target redial also invalidate it before the next ready frame.
- Both model picker surfaces, Settings platform defaults, managed switching, automatic fresh-user default resolution, and first-send create preflight consume the same route evidence.
- Unsupported/unknown routes disable only Aino managed choices and show the existing localized unsupported explanation. Custom/BYOK providers remain selectable and remain the default resolver's higher-priority result.
- Preserved the reviewed captured-send ordering: exact owner readiness is awaited, capability is rechecked, and only then are managed create parameters admitted. No prompt/tool replay path was added.

TDD and verification evidence: [b6-capability-recovery-checkpoint1-tests.log](./b6-capability-recovery-checkpoint1-tests.log).

Files changed are exactly the 17 renderer files shown by `git show --stat 911151ea09`; no native/shared/Python, C4 billing/reply code, docs, or inherited E2E files were included.

Self-review:

- Exact same-profile sources cannot share evidence because keys include the authoritative registry connection id.
- Reconnect and endpoint replacement return the route to unknown until a new ready frame arrives.
- Primary capability recording uses the registry's published primary connection id, never whichever secondary route is currently visible.
- The platform bridge's existence and `/api/model/info` metadata never count as gateway capability evidence.

Limits / remaining work:

- This checkpoint does not implement catalog vision/reasoning behavior, actionable empty/balance/quota/auth recovery, or exact platform-origin preference/history fencing; those are intentionally separate checkpoints.
- It is renderer unit/integration proof only. Native E2E, screenshots, build/package/run, external API, and full-suite acceptance remain root-owned final gates.
- The working tree still contains root-owned documentation edits and two inherited native E2E files; this commit did not stage or modify them.

### Checkpoint 1 review round 1

Status: fixed and committed for scoped re-review.

Commit: `ae59e82f5226615d7bd04237d13919f91f697509` (`fix(desktop): fence managed capability lifecycle`). Exact parent: `488f57a7d53c605ef46e23d37b556ed6191b2e39` (root-owned docs checkpoint on top of the original capability commit).

Findings addressed:

- The fresh composer now subscribes to the exact route capability atom and re-runs the existing guarded default resolver only on a route transition to supported. The existing selection-generation/manual-pick guard preserves an explicit BYOK pick.
- Primary subscribers pass their immutable gateway object into the registry reporter; stale primary object state/events stop before capability or general event fan-in. Secondary callbacks assert their exact entry still owns the registry scope before writing.
- No redundant underlying-WebSocket generation manager was added: `apps/shared/src/json-rpc-gateway.ts:200-253` already rejects message/close/open/error callbacks when `this.socket !== socket`, and event dispatch is synchronous. The new ownership checks cover the distinct old gateway-object / replaced registry-entry boundary.
- `PlatformModelList.managedCapability` is required. Unknown cannot implicitly become supported at the leaf.
- First-send uses two captured coordinates deliberately: backend config/default reads may use `targetProfile`, while socket capability uses immutable `{connectionId, profile}` from the captured owner route. Tests use a differing `targetProfile` and prove unsupported or replaced captured owners issue neither `session.create` nor `prompt.submit`, even if the foreground replacement route is supported.

Complete raw logs (stdout/stderr plus explicit wrapper exit status):

- `/tmp/b6-capability-r1-final-tests.log`: 8 files, 163 tests passed, `EXIT_STATUS=0`.
- `/tmp/b6-capability-r1-final-typecheck.log`: renderer TypeScript, `EXIT_STATUS=0`.
- `/tmp/b6-capability-r1-final-eslint.log`: scoped ESLint, no findings, `EXIT_STATUS=0`.
- Earlier focused red/green evidence: `/tmp/b6-capability-r1-focused.log` (`EXIT_STATUS=1`, assertion matcher incompatibility) and `/tmp/b6-capability-r1-focused-green.log` (`EXIT_STATUS=0`, 10 focused tests).

The matcher failure above is not claimed as behavior RED. A bounded production-behavior RED was subsequently captured by keeping the final tests in place, temporarily reversing only the three owned production hunks with `apply_patch`, and restoring them with `apply_patch` immediately after the run. No checkout, reset, stash, or index operation was used; after restoration the production-file diff hash was empty.

- `/tmp/b6-capability-r1-behavior-red.log`: `EXIT_STATUS=1`; all four behavior assertions fail against prior production. The log shows the late ready transition leaves the default empty, the omitted leaf paints Loading/models instead of fail-closed copy, and both unsupported/replaced captured-owner sends call exact-owner `session.create`.
- `/tmp/b6-capability-r1-behavior-green.log`: restored production, four focused tests pass, `EXIT_STATUS=0`.
- `/tmp/b6-capability-r1-behavior-typecheck.log`: `EXIT_STATUS=0`.
- `/tmp/b6-capability-r1-behavior-eslint-green.log`: `EXIT_STATUS=0`, no findings.

The two test hardening hunks are committed separately as `5acc1c18b3a36d76afc31580abec3804ce56c880` (`test(desktop): prove managed capability rejection`), exact parent `ae59e82f5226615d7bd04237d13919f91f697509`. The final checkpoint-1 re-review range is therefore `911151ea092f294593ad72fe9c4676f65103d6ca..5acc1c18b3a36d76afc31580abec3804ce56c880`, with root docs commit `488f57a7d53c605ef46e23d37b556ed6191b2e39` interleaved but outside renderer scope.

Round-1 boundary: ten renderer source/test files only. No native/shared/Python, prompt/history schema, C4 code, docs, inherited E2E, build, package, or live service changes.

Checkpoint-2 WIP is preserved at exact stash object `3fc16643749d68b688d3d75d35b06610b25dbc70` with all 12 expected owned paths, including untracked `platform-model-capability.ts` and its test. It will be restored by exact object id only after the root-owned frozen native snapshot; older user stashes are untouched and must not be popped or dropped.

## Checkpoint 2 — catalog capabilities and actionable recovery

Status: complete, committed checkpoint pending below.

Implemented:

- Preserved allowlisted stable ticket/owner/bind error codes without exposing remote messages or payloads; unknown errors remain `gateway_binding_failed`.
- Verified a selected platform model against its ready catalog and stored account owner before governing image send, first-create reasoning, and live Aino reasoning state.
- Unsupported image sends preserve text and attachments, make no request, and expose the existing model picker. Supported images retain the normal attach/submit path.
- Empty/error/signed-out/unavailable catalog states route to the existing custom picker, retry control, or My Account route. Balance/quota rows retain both wallet and custom exits.
- Stable managed failures expose picker recovery and carry deterministic assistant error surfaces (`billing`, `auth`, or `gateway`) with `retryable: false`; generic/BYOK errors retain their existing behavior and no prompt replay path was introduced.
- A successful live selection of a verified non-reasoning Aino model clears stale reasoning effort through the same resolver and writes the explicit empty live setting.

TDD and validation evidence:

- Actual RED: `/tmp/b6-checkpoint2-api-red.log` (`EXIT_STATUS=1`) proved allowlisted errors were formerly flattened; the new quota first-send recovery assertion also failed before the picker action was added.
- `/tmp/b6-checkpoint2-final-tests.log`: 6 focused renderer files, all tests passed, `EXIT_STATUS=0`.
- `/tmp/b6-checkpoint2-final-typecheck.log`: renderer TypeScript passed, `EXIT_STATUS=0`.
- `/tmp/b6-checkpoint2-final-eslint.log`: scoped ESLint passed, `EXIT_STATUS=0`.
- `git diff --check`: passed.

Boundary: renderer-only platform capability/recovery code, its tests, five locale/type files, and this report. No native/shared/Python, frozen distribution, E2E, C4 billing/reply metrics, external API, or phase-3 origin/history code is included.

## Checkpoint 3 — authoritative platform-origin preference/history fencing

Pending as a narrow renderer-only checkpoint using existing `platformModels.owner(expectedAccountRevision)`; no native/shared/Python contract change.

Binding requirements:

- Cache only authoritative `{platform_origin,user_id}` returned by main. Fence every async result by the captured account revision, account user id, and account mode; reject results after sign-out/reauth/account/mode changes.
- Never infer origin from browser location, renderer input, catalog URLs, or a process environment variable.
- Add authoritative origin to platform default preference ownership so the same development user id at two platform origins cannot share a default. Legacy account-only keys remain limited to their deliberate legacy-local/production namespace.
- Retain origin in `PlatformSessionModel`/history ownership from trusted session metadata or resolved main authority. Read/write comparisons require both origin and user id when known; a mismatched/unknown old-account platform session remains readable but not writable and offers the existing “new chat with current account” action.
- Keep current account revision/user/mode and exact connection/profile ownership independent: platform origin identifies the commercial authority, while gateway capability and RPC routing continue to use the captured socket route.
- Tests: two development origins with the same user id keep distinct defaults; late owner result after revision/mode change is discarded; history from origin A is read-only under origin B even with equal user id; no preference/session rewrite occurs on mismatch.
