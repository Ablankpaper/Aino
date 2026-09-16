/** Managed bindings cannot change while their owning turn runs or builds. */
export function managedModelSwitchBlocked(currentProvider: string, targetProvider: string, busy: boolean): boolean {
  return busy && (currentProvider === 'aino' || targetProvider === 'aino')
}
