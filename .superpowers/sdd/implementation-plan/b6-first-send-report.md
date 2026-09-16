# B6 first-send and stale-runtime recovery slice report

## Status

Implemented only the bounded first-send/recovery slice from `b6-first-send-brief.md`. This does not complete B6.

Baseline: `eee4154ebfe0cf63faf6f7277209e02ab2dea174`

Code commit: `14106664fcac3ae1d7ddfa1e3a29097930c58082`

## Behavior delivered

- An automatically selected Aino catalog default retains provenance `default` while its billing identity is emitted as `model_source: "aino"` and `model_id` during the real first-send create snapshot.
- Ordinary backend/BYOK defaults remain omitted from `session.create`; manual selections retain their existing override behavior.
- The real session and prompt hooks now have integration coverage for first send: create draft -> managed ticket -> native bind-ready -> one prompt submit, with consistent model/account ownership and no `config.set` write.
- Managed-ticket failures classified by the canonical runtime-gone predicate are rethrown so the existing resume policy can act. All unrelated errors remain sanitized as `{ ok: false, error: { code: "gateway_binding_failed" } }` with no raw remote text.
- The real prompt hook plus production session RPC dispatcher have ordinary and queued coverage for stale Aino runtimes: ticket(old) -> resume -> ticket(new) -> native bind(new) -> exactly one prompt(new).
- The router independently verifies Aino bind-before-submit on the owning profile and preserves the original structured stale error object.

## TDD evidence

### RED: automatic Aino default omitted

Command:

```bash
cd apps/desktop
npm run test:ui -- src/app/session/hooks/use-session-actions.test.tsx
```

Observed: 98 tests passed and the new regression test failed because `session.create` received only `cols`, `fast`, `profile`, and `source`; expected `model_source: "aino"` and `model_id: "catalog-a"` were absent.

### GREEN: automatic Aino default first send

The same command passed 99/99 after the minimal snapshot branch. The final form composes the real session and prompt hooks and verifies:

```text
session.create -> session.managed_model_ticket -> native bind -> prompt.submit
```

It also verifies no BYOK `config.set` call.

### RED: stale managed-ticket error flattened

Command:

```bash
cd apps/desktop
npm run test:ui -- src/api/platform-models.test.ts
```

Observed: the new regression expected the original structured 4001 error to reject, but the promise resolved with `gateway_binding_failed`.

### GREEN: stale classification and sanitization

The same command passed 2/2 after preserving only canonical runtime-gone errors. The existing unrelated-error case was strengthened to assert the exact sanitized result and absence of `raw remote error`.

### Recovery integration

`use-prompt-actions/index.test.tsx` passes ordinary and queued cases through the production dispatcher. Both assert exactly:

```text
managed ticket(old runtime)
session.resume(stored id)
managed ticket(new runtime)
native bind(new runtime)
one prompt.submit(new runtime)
```

`session-request-router.test.ts` separately verifies bind-before-submit and identity-preserving structured error propagation.

## Verification

Passed:

```bash
cd apps/desktop
npm run test:ui -- \
  src/api/platform-models.test.ts \
  src/api/platform-session-binding.test.ts \
  src/lib/platform-session-model.test.ts \
  src/app/chat/composer/platform-model-selection.test.tsx \
  src/store/session-request-router.test.ts \
  src/app/session/hooks/use-session-actions.test.tsx \
  src/app/session/hooks/use-prompt-actions/index.test.tsx
```

Result: 7 files passed, 279 tests passed.

Additional focused result after test-isolation tightening:

```bash
npm run test:ui -- src/app/session/hooks/use-prompt-actions/index.test.tsx
```

Result: 146/146 passed.

Scoped ESLint completed with zero errors. It reports one pre-existing `react-hooks/exhaustive-deps` warning at `use-prompt-actions/index.test.tsx:242`. `git diff --check` passed for all six code/test paths.

Full `npm run typecheck` is currently blocked by concurrent controller work outside this slice:

```text
src/app/settings/platform-billing/wallet-view.test.tsx(7,32):
error TS2307: Cannot find module './wallet-view' or its corresponding type declarations.
```

TypeScript reported no errors in this slice before stopping at that unrelated missing file. The controller-owned billing/Electron/shared-contract changes were not staged or modified by this commit.

## Remaining B6 limitations

These remain explicitly out of scope and unimplemented by this slice:

- account + connection + profile platform-default scope
- account-switch draft/history behavior
- model-switch rollback and busy/deferred policy
- connection capability pre-gating
- vision/reasoning behavioral gating
- actionable balance/quota/empty recovery
- native renderer-to-main acceptance screenshots/tool roundtrip
