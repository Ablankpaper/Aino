# Aino desktop account development

The desktop opens in a compact native login window. The three login screens
follow Figma nodes `24:6`, `24:40`, and `24:76` in the AINO design. After
verification, the native window restores its workspace geometry before the chat
layout mounts. Settings → My account appears above Model and shows account
details, nickname editing and sign-out; it does not contain the login form.
Nicknames contain 1–32 characters and appear in the sidebar as soon as the
backend confirms the change. Canceling or a failed save preserves the saved name.

## Development authentication

Run `npm run dev` from `apps/desktop`. The backend spawned by this command uses
the existing internal desktop development marker to enable the test code
`1234`. A backend started separately can explicitly enable development accounts
in its resolved `config.yaml`:

```yaml
account:
  dev_mode: true
```

The first successful verification creates an account. Later verifications reuse
its ID. The JSON-RPC methods are `account.status`, `account.request_code`,
`account.verify_code`, `account.update_profile`, and `account.logout`.
`account.update_profile` changes only the signed-in account's nickname; the
account ID and login identifier stay the same. Codes expire after ten minutes,
resending waits sixty seconds, and five incorrect attempts exhaust a code.
Verification consumes the code. Sign-out keeps the account record.

Account records and the current development sign-in are stored in `account.json`
under the backend's resolved home with an atomic private-file write. The desktop
routes account operations to the connection's default home, independently of
which agent workspace or project is selected. The renderer keeps only an
in-memory view and does not store credentials in localStorage.

## Delivery boundary

This implements the local development account flow, not a deployed identity
service. A fixed test code does not prove ownership of an email address or phone
number. It does not isolate existing conversations by account or replace the
gateway's existing transport authentication.

No SMS or email is sent. WeChat has an explicit unavailable state until the
real integration is configured. The agreement links show a development notice;
the publisher must provide the final terms and privacy policy. Packaged builds
without development mode report the account service as unconfigured.

## Validation

```sh
scripts/run_tests.sh tests/tui_gateway/test_account_methods.py
cd apps/desktop
npm run test:ui -- src/app/account src/store/account.test.ts
npm run test:desktop:platforms -- electron/account-window.test.ts
npm run typecheck
npm run build
```

Native window QA covers identifier entry, invalid and valid codes, restoration
of workspace geometry, the account details page, and return to the compact
window on sign-out. The code-request timer and stale-response ordering have
behavior tests alongside the implementation.
