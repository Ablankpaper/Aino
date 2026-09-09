/**
 * Resolve the checkout that owns the desktop update operation.
 *
 * The Electron main process has two notions of "packaged": the real
 * `app.isPackaged` value and a compatibility flag used by production bundles
 * launched directly from a source checkout. Callers pass the real value so
 * the compatibility flag cannot hide a valid source checkout. The resolver
 * then validates each candidate before trusting it.
 */
export interface UpdateRootOptions {
  activeHermesRoot: string
  /** The real Electron `app.isPackaged` value (not a compatibility env flag). */
  actualPackaged: boolean
  isGitCheckout: (root: string) => boolean
  isSourceRoot: (root: string) => boolean
  overrideRoot?: null | string
  sourceRepoRoot?: null | string
}

/** Extract the runtime version from hermes_cli/__init__.py contents. */
export function parseHermesVersion(source: string): string | null {
  const match = source.match(/__version__\s*=\s*["']([^"']+)["']/)

  return match?.[1] ?? null
}

export function resolveUpdateRoot({
  activeHermesRoot,
  actualPackaged,
  isGitCheckout,
  isSourceRoot,
  overrideRoot,
  sourceRepoRoot
}: UpdateRootOptions): string {
  const candidates = [overrideRoot, actualPackaged ? null : sourceRepoRoot, activeHermesRoot]
    .filter((candidate): candidate is string => Boolean(candidate))
    .filter(candidate => isSourceRoot(candidate))

  return candidates.find(candidate => isGitCheckout(candidate)) || candidates[0] || activeHermesRoot
}
