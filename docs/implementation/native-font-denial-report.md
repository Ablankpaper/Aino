# Native Font Denial Audit

## Scope

The native acceptance fixture keeps the Chromium network boundary closed. The
existing theme requests the public Google Fonts stylesheet for Courier Prime;
the fixture must deny that request rather than allow external network access.

## Rule

`onBeforeRequest` cancels every non-loopback HTTP(S)/WS request before transport.
Only an exact `GET` stylesheet request for the known Courier Prime URL with no
upload data and no `Authorization` header may be recorded as an expected font
denial. The request observer is installed before the production Electron main
module creates its first window. Observer attach/enable errors and any other
request shape fail closed.

The audit markers contain hostnames only. They do not persist the stylesheet
query string, credentials, request bodies, or response data. The fixture does
not claim that the font was downloaded; the expected result is `blocked`.
The exact font eventually used to render text is not asserted by this audit.

## Verification

On 2026-09-17, from the Aino desktop workspace:

```text
../../node_modules/.bin/tsc -p tsconfig.e2e.json --noEmit
../../node_modules/.bin/eslint e2e/platform-real-api.ts e2e/platform-account-model-billing.spec.ts
../../node_modules/.bin/playwright test e2e/platform-account-model-billing.spec.ts \
  -g 'transport audit|native fixture guards|fixture decimal' \
  --workers=1 --retries=0
```

Results: typecheck passed; lint passed with no errors; focused guard proof passed
3/3. The proof observed the real Electron main process, denied a non-loopback
fetch before transport, denied the exact theme stylesheet, rejected an
authorization-bearing stylesheet shape, and blocked Python credential discovery
without spawning the system credential command.

The full native account/model/billing test subsequently passed in 2.4 minutes
with zero retries, including restart/history re-binding, BYOK and final secret
audits. The tested fixture is committed as `32c0ca8eae`; business bundles remain
unchanged. An intermediate run failed on an outdated BYOK menu locator
(`mock-model` rather than the visible `Mock Model`); only the test selector was
corrected. See [the retained receipt](aino-platform-native-acceptance-20260917.json)
and [acceptance matrix](aino-platform-acceptance-matrix.md).

This is an isolated acceptance fixture, not an OS sandbox against hostile code.
Candidate/observed counts are reconciled per launch, not by a shared Chromium/CDP
request identifier. Real SMS, paid model providers, payment channels and signed
release packages remain separate validation requirements.
