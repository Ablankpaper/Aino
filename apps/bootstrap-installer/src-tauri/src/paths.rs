//! Filesystem paths + logging setup.
//!
//! Resolves the data root used by the Aino desktop installer.
//!
//! The Python CLI keeps its historical `~/.hermes` / `%LOCALAPPDATA%\\hermes`
//! defaults for command-line compatibility. The branded desktop uses its own
//! Aino root (`~/.aino` / `%LOCALAPPDATA%\\aino`) so a fresh desktop install
//! does not silently share state with a separate Hermes installation. The
//! installer passes the resolved root to `install.sh`/`install.ps1` explicitly,
//! keeping the Rust and script sides on one path.
//!
//! An existing Hermes *runtime* root is a deliberately narrow migration
//! fallback: it is selected only when the new Aino root does not exist. A
//! random `~/.hermes` directory created for CLI-only config is not enough to
//! redirect a fresh Aino install. An explicit `HERMES_HOME` always wins.

use std::path::{Path, PathBuf};
#[cfg(target_os = "macos")]
use std::process::Command;
use tracing_appender::non_blocking::WorkerGuard;

const AINO_HOME_DIR_NAME: &str = "aino";
const LEGACY_HOME_DIR_NAME: &str = "hermes";

/// Select the primary path unless it has not been created yet and a legacy
/// path is present. Kept pure so the migration precedence is easy to test.
fn select_home(primary: PathBuf, legacy: PathBuf, primary_exists: bool, legacy_exists: bool) -> PathBuf {
    if !primary_exists && legacy_exists {
        legacy
    } else {
        primary
    }
}

fn default_home_paths() -> (PathBuf, PathBuf) {
    #[cfg(target_os = "windows")]
    {
        let base = dirs::data_local_dir().unwrap_or_else(|| {
            dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("AppData")
                .join("Local")
        });
        return (
            base.join(AINO_HOME_DIR_NAME),
            base.join(LEGACY_HOME_DIR_NAME),
        );
    }

    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    (
        home.join(format!(".{AINO_HOME_DIR_NAME}")),
        home.join(format!(".{LEGACY_HOME_DIR_NAME}")),
    )
}

/// Returns the canonical Aino desktop home directory, respecting
/// `HERMES_HOME` if set and falling back to an existing legacy Hermes root.
pub fn hermes_home() -> PathBuf {
    if let Ok(override_path) = std::env::var("HERMES_HOME") {
        if !override_path.trim().is_empty() {
            return PathBuf::from(override_path);
        }
    }

    let (primary, legacy) = default_home_paths();
    let primary_exists = primary.exists();
    // Only a real checkout is a migration target. This keeps a user who has
    // merely run the Hermes CLI (and therefore has a config directory) on the
    // isolated Aino root while still upgrading an existing desktop/runtime
    // installation in place.
    let legacy_exists = legacy.join("hermes-agent").is_dir();
    select_home(primary, legacy, primary_exists, legacy_exists)
}

pub fn log_dir() -> PathBuf {
    hermes_home().join("logs")
}

pub fn log_path() -> PathBuf {
    log_dir().join("bootstrap-installer.log")
}

pub fn bootstrap_cache_dir() -> PathBuf {
    hermes_home().join("bootstrap-cache")
}

/// Stable location the installer copies itself to after a successful install.
/// The desktop app re-invokes this with `--update`, and the start-menu /
/// desktop shortcuts can point users back to it. Lives directly under
/// HERMES_HOME so it survives repo checkout deletion (unlike anything under
/// hermes-agent/).
///
/// On Windows this is `%LOCALAPPDATA%\\aino\\Aino-Setup.exe`; on other
/// platforms the extension differs but the directory is the same.
pub fn installer_dest() -> PathBuf {
    let name = if cfg!(target_os = "windows") {
        "Aino-Setup.exe"
    } else {
        "Aino-Setup"
    };
    hermes_home().join(name)
}

/// Marker the updater writes for the duration of an in-app update and removes
/// when it finishes (see update.rs `UpdateMarkerGuard`). A freshly-launched
/// desktop checks this before spawning its own local backend: spawning one
/// mid-update re-locks the venv shim and triggers `force_kill_other_hermes`,
/// which then kills that legitimate backend in a respawn loop (#50238).
///
/// Lives directly under HERMES_HOME (same rationale as `installer_dest`) so the
/// Electron desktop — which resolves HERMES_HOME identically and pins it into
/// the updater's env — agrees on the exact path.
pub fn update_in_progress_marker() -> PathBuf {
    hermes_home().join(".hermes-update-in-progress")
}

/// Copy the currently-running installer binary to `installer_dest()` so it's
/// available for future `--update` runs and shortcut launches.
///
/// No-ops (returns Ok) when the running exe is ALREADY the destination — which
/// is exactly the case during an `--update` run (the desktop launched us FROM
/// that path), where copying onto ourselves would be a Windows sharing
/// violation. Best-effort: a failure here must not fail the install, so the
/// caller logs and continues.
///
/// NOTE: because of that no-op, a user's staged installer is only ever written
/// by a full install/repair. Every later `--update` runs the ORIGINAL binary,
/// so an installer-protocol change can strand the whole installed base on a
/// binary that predates it (see `restage_from_checkout`, which repairs this
/// from the freshly-updated checkout).
pub fn copy_self_to_hermes_home() -> std::io::Result<()> {
    let src = std::env::current_exe()?;
    let dest = installer_dest();

    // Skip if we're already running from the destination (update re-invocation
    // or a prior copy). canonicalize both so symlinks / 8.3 short paths / case
    // differences don't trick us into a self-copy.
    let same = match (src.canonicalize(), dest.canonicalize()) {
        (Ok(a), Ok(b)) => a == b,
        _ => src == dest,
    };
    if same {
        tracing::info!(?dest, "installer already at destination; skipping self-copy");
        return Ok(());
    }

    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::copy(&src, &dest)?;
    repair_macos_installer_helper(&dest);
    tracing::info!(?src, ?dest, "copied installer to HERMES_HOME");
    Ok(())
}

#[cfg(target_os = "macos")]
fn repair_macos_installer_helper(path: &Path) {
    // The staged helper may inherit quarantine from the downloaded installer.
    // Desktop later launches this exact file for in-app updates, so make it
    // executable before the update handoff reaches LaunchServices/Gatekeeper.
    let _ = Command::new("/usr/bin/xattr")
        .args(["-cr"])
        .arg(path)
        .status();

    let verify = Command::new("/usr/bin/codesign")
        .arg("--verify")
        .arg(path)
        .status();

    if !matches!(verify, Ok(status) if status.success()) {
        let _ = Command::new("/usr/bin/codesign")
            .args(["--force", "--sign", "-"])
            .arg(path)
            .status();
    }
}

#[cfg(not(target_os = "macos"))]
fn repair_macos_installer_helper(_path: &Path) {}

/// Where the bootstrap-complete marker lives (existence-only for the Rust
/// installer fast path; JSON schema-checked by the Electron app). Per main.ts:
///   const BOOTSTRAP_COMPLETE_MARKER = path.join(ACTIVE_HERMES_ROOT, '.hermes-bootstrap-complete')
/// We don't always know ACTIVE_HERMES_ROOT until install.ps1 reports it, so
/// this is a probe helper, not a definitive path.
pub fn likely_bootstrap_marker(install_root: &Path) -> PathBuf {
    install_root.join(".hermes-bootstrap-complete")
}

/// Initializes tracing to bootstrap-installer.log under HERMES_HOME/logs/.
/// Returns a guard that flushes the appender on drop — keep it alive for
/// the lifetime of the process.
pub fn init_logging() -> Option<WorkerGuard> {
    let dir = log_dir();
    if let Err(err) = std::fs::create_dir_all(&dir) {
        // No log dir → log to stderr only. Don't panic; the installer
        // should still be usable on an exotic filesystem.
        eprintln!("[aino-setup] could not create log dir {dir:?}: {err}");
        return None;
    }

    let file_appender = tracing_appender::rolling::never(&dir, "bootstrap-installer.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    let env_filter = tracing_subscriber::EnvFilter::try_from_env("HERMES_BOOTSTRAP_LOG")
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));

    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_writer(non_blocking)
        .with_ansi(false)
        .with_target(true)
        .init();

    Some(guard)
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_log_path() -> String {
    log_path().to_string_lossy().into_owned()
}

#[tauri::command]
pub fn get_hermes_home() -> String {
    hermes_home().to_string_lossy().into_owned()
}

#[tauri::command]
pub fn open_log_dir(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let path = log_dir();
    app.opener()
        .open_path(path.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migration_prefers_aino_when_both_roots_exist() {
        let selected = select_home(
            PathBuf::from("/Users/demo/.aino"),
            PathBuf::from("/Users/demo/.hermes"),
            true,
            true,
        );
        assert_eq!(selected, PathBuf::from("/Users/demo/.aino"));
    }

    #[test]
    fn migration_uses_legacy_only_when_aino_is_absent() {
        let selected = select_home(
            PathBuf::from("/Users/demo/.aino"),
            PathBuf::from("/Users/demo/.hermes"),
            false,
            true,
        );
        assert_eq!(selected, PathBuf::from("/Users/demo/.hermes"));
    }

    #[test]
    fn migration_defaults_to_aino_when_neither_root_exists() {
        let selected = select_home(
            PathBuf::from("/Users/demo/.aino"),
            PathBuf::from("/Users/demo/.hermes"),
            false,
            false,
        );
        assert_eq!(selected, PathBuf::from("/Users/demo/.aino"));
    }

    #[test]
    fn installer_destination_uses_aino_setup_name() {
        assert_eq!(
            installer_dest()
                .file_name()
                .and_then(|name| name.to_str()),
            Some(if cfg!(target_os = "windows") {
                "Aino-Setup.exe"
            } else {
                "Aino-Setup"
            })
        );
    }
}
