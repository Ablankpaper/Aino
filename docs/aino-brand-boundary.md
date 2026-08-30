# Aino brand boundary

This document records the first Aino white-label boundary so future upstream
syncs and product work have an explicit contract.

## What is Aino in this phase

- The desktop product name is **Aino**.
- Packaged desktop identity is `com.ablankpaper.aino`; installers, executable
  names, native About panels, window titles, and protocol registration use the
  Aino identity.
- The renderer applies an Aino label overlay to product-facing translations.
  Locale source files remain upstream-shaped so syncing translations does not
  create a large conflict surface.
- The current mark is a small vector Aino monogram. It is deliberately
  replaceable when a final visual identity is approved.

## Data isolation

Aino is treated as a separate application by default:

| Scope                                                | Aino default                                                | Compatibility override                                            |
| ---------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Electron app state                                   | OS app-data directory for `Aino`                            | `HERMES_DESKTOP_USER_DATA_DIR` for tests/dev sandboxes            |
| Agent config, sessions, skills, plugins, credentials | `~/.aino` (macOS/Linux) or `%LOCALAPPDATA%\\aino` (Windows) | Explicit `HERMES_HOME` (or its Windows user-level registry value) |

There is no silent copy of Hermes credentials, sessions, or plugins. A future
import/migration flow must be explicit, previewable, and reversible.

## What remains Hermes-compatible

The following are runtime interfaces, not product branding, and remain unchanged
in this phase:

- Python packages/modules and the `hermes` CLI command;
- `HERMES_HOME`, `hermes_cli`, `@hermes/plugin-sdk`, and gateway/RPC names;
- `hermes-media` and legacy `hermes://` deep links (Aino links are accepted too);
- backend state schemas, profile names, session formats, and update hand-off
  files;
- MIT license text and Nous Research/upstream attribution.

## Upstream and release policy

`upstream` remains the Nous Research repository and is fetch-only. Aino changes
land on purpose-named branches (`aino/<purpose>`), then can be synchronized with
upstream manually. The desktop package points at the Ablankpaper/Aino repository;
release/update infrastructure should be treated as a separate follow-up before
publishing production installers.

This boundary is intentionally narrower than a repository-wide Hermes rename.
Internal renaming, data migration, protocol migration, and a final logo are
separate proposals that require their own compatibility and acceptance plans.
