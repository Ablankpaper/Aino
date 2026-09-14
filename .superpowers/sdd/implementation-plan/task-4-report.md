## Task 4: A6 Desktop platform account wiring

Status: DONE_WITH_CONCERNS

Local integration is complete. Real SMS delivery, production captcha completion, and
Windows/Linux secure-storage behavior were not verified on this macOS host.

## Implementation

- Connected the desktop account gate, compact phone login, existing-email/TOTP flow,
  invitation/agreement fields, remember state, structured retry errors, and account
  settings to the main-owned `platformAccount` bridge.
- Kept the platform identity independent from gateway/profile changes and backend boot
  overlays; account state broadcasts to trusted primary/session windows and logout
  propagates to peers and restart.
- Added an explicit unpackaged `--aino-legacy-account-development` adapter selector for
  fixed-code legacy workflows. Ordinary development and packaged builds select platform
  identity; there is no production-error fallback to fixed `1234`.
- Added a loopback HTTP platform fixture and native Playwright coverage using the real
  Electron main/preload bridge, including unavailable-backend login, compact geometry,
  login/restore, peer identity, profile fields, peer logout, and signed-out restart.
- Closed the A6 captcha gap: after main-owned public capability and generation checks,
  disabled captcha returns an empty proof without creating a verification window or
  loading `/desktop/captcha`. Enabled providers retain the isolated-window, nonce,
  origin/frame, expiry, generation, and proof validation path.

## TDD evidence

Initial Task 4 focused reds covered missing platform adapter/store behavior, login gate
and card contracts, settings integration, explicit legacy selector, and cross-window
broadcast ordering. The initial native run also red at OTP input: the fixture showed a
400px captcha window returning `NOT_FOUND` while the main request remained pending.

For A6 specifically, `electron/platform-captcha.test.ts` first failed because disabled
policy still called `isolatedSession()`/`createWindow()`. The test now asserts the
consumer-visible contract (empty proof and zero window/session creation); the enabled
provider test remains explicit and passes a real Turnstile proof shape.

## Verification

- `npm run test:ui`: 849 files, 7,835 tests passed.
- `npm run test:desktop:platforms`: 162 files passed, 2 skipped; 2,237 tests passed,
  6 skipped.
- `npx playwright test e2e/platform-account.spec.ts --reporter=list`: 1 passed (7.3s)
  after `node scripts/bundle-electron-main.mjs --dev`.
- `npm run typecheck`: passed for renderer, Electron, and E2E projects.
- Scoped ESLint over changed Task 4 TypeScript/TSX files: 0 errors, 0 warnings.
- `npm run build`: passed; renderer, Electron main/preloads, captcha preload, native
  dependencies, and `assert-dist-built` all completed.
- `git diff --check`: passed.

Native screenshot evidence from the passing Playwright run remains at:

- `apps/desktop/test-results/platform-account-uses-the--07892-ut-a-gateway-owned-identity/platform-account-login-native.png`
- `apps/desktop/test-results/platform-account-uses-the--07892-ut-a-gateway-owned-identity/platform-account-native.png`

The first shows the compact login shell with agreement/remember controls; the second
shows the authenticated account settings with nickname, masked phone, email, and user ID.
Playwright `test-results/` is intentionally not committed.

## Concerns

- The native fixture uses an isolated loopback platform origin and synthetic OTP `246810`;
  no production endpoint, credentials, SMS, paid inference, or API repository was used.
- Actual provider widgets require authorized site configuration and were covered only by
  provider-policy/security tests, not a live vendor challenge.
- OS-specific safe-storage/ACL behavior still needs native Windows/Linux lanes; this host
  only exercised the macOS development path.

## Files and ownership

Task 4 changes are limited to the desktop account/API/store/UI/i18n/docs wiring, explicit
legacy adapter launch support, the native platform-account E2E fixture, and the captcha
disabled-policy regression. Controller-owned
`docs/implementation/aino-platform-progress.md` and generated `test-results/` remain
unstaged.
