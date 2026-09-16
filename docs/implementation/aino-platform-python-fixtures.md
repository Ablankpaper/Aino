# D Python fixture cleanup report

Delivery evidence for the bounded fixture cleanup; full platform acceptance is tracked separately.

Date: 2026-09-16

## Scope and commit

- Fixture-fix commit: `2716c31ea9` (`test: stabilize bounded Python regression fixtures`)
- Production files changed: none
- Owned tests changed:
  - `tests/agent/test_codex_aux_timeout_fd_ownership.py`
  - `tests/plugins/memory/test_hindsight_provider.py`
  - `tests/hermes_cli/test_session_recovery_lost_and_found.py`
  - `tests/cron/test_file_permissions.py`
  - `tests/tools/test_delegate.py`

## RED receipt

Command:

```text
scripts/run_tests.sh -j 3 tests/agent/test_codex_aux_timeout_fd_ownership.py tests/plugins/memory/test_hindsight_provider.py tests/hermes_cli/test_session_recovery_lost_and_found.py tests/cron/test_file_permissions.py tests/tools/test_delegate.py
```

Log: `/tmp/aino-d-python-fixtures-red.log`

Result: 5 files, 180 passed, 5 failed, 3 skipped in 54.6 seconds.

- `test_hindsight_provider.py`: two `TestMultiplexBackgroundScope` failures because the fake embedded client left `tools.lazy_deps.ensure` active; dependency preparation failed closed before the fake client could read the scoped secret.
- `test_session_recovery_lost_and_found.py`: the missing-CLI fixture changed `find_sqlite3_cli` but left the paired cached refusal as `wal_reset_vulnerable`, selecting the unsafe-version guidance branch.
- `test_file_permissions.py`: the fixture used macOS `/tmp`, a symlink to `/private/tmp`; home initialization intentionally does not chmod across a symlink boundary.
- `test_delegate.py`: the registry canonicalized `/tmp` to `/private/tmp`; the assertion compared path spellings instead of the underlying database path.
- `test_codex_aux_timeout_fd_ownership.py` passed in this run, matching the documented intermittent race: its keepalive generator allowed owner polling and the watchdog to compete at the same deadline.

## Fixes

- Patched the Hindsight scope fixture at the lazy-dependency preparation seam while retaining the real embedded-client construction and scoped secret lookup.
- Set both SQLite discovery outcomes in the missing-CLI fixture, without changing the vulnerable-version production gate.
- Resolved the temporary fixture root before testing direct-owner home permissions.
- Compared resolved child and parent database paths, preserving the same-file behavior contract across macOS path aliases.
- Replaced the keepalive race with a blocked stream and synchronized background timer. The watchdog callback must run on the non-owner thread, unblock the stream, and finish before assertions; the existing owner-deadline test remains intact.

## GREEN receipt

Command:

```text
scripts/run_tests.sh -j 3 tests/agent/test_codex_aux_timeout_fd_ownership.py tests/plugins/memory/test_hindsight_provider.py tests/hermes_cli/test_session_recovery_lost_and_found.py tests/cron/test_file_permissions.py tests/tools/test_delegate.py
```

Log: `/tmp/aino-d-python-fixtures-green.log`

Result: 5 files, 185 passed, 0 failed, 3 skipped in 19.9 seconds.

Per file:

- `test_codex_aux_timeout_fd_ownership.py`: 2 passed
- `test_hindsight_provider.py`: 85 passed, 1 skipped
- `test_session_recovery_lost_and_found.py`: 10 passed, 2 skipped
- `test_file_permissions.py`: 7 passed
- `test_delegate.py`: 81 passed

`git diff --check` produced no errors before the fixture commit.

## Separate blocker from the prior regression log

`/tmp/aino-b5-regression.log` labels `tests/agent/test_codex_ttfb_watchdog.py` as a file where no tests ran. The detailed entry shows that it actually collected 21 tests, completed five, then exceeded the runner's 60-second per-file limit and was SIGKILLed. This file was outside D ownership and was not changed or rerun.

## Not run

- No full Python suite or directory-wide Python suite.
- No repeated stress loop or repeated timeout-file run.
- No out-of-scope `test_codex_ttfb_watchdog.py` rerun.
- No JavaScript, Go, browser, desktop, packaged-app, or platform-native QA.
- No external dependency installation, network request, production operation, push, merge, or PR action.
