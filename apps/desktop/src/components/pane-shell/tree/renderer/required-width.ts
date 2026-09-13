import { computedPx } from './track-model'

/** Read the rendered tracks, including collapsed/minimized and user-resized panes. */
export function layoutRequiredWidth(container: HTMLElement): number {
  const root = container.querySelector<HTMLElement>('[data-tree-split]')

  if (!root) {
    return 0
  }

  const measure = (split: HTMLElement): number => {
    const view = split.ownerDocument.defaultView!
    const horizontal = view.getComputedStyle(split).flexDirection === 'row'

    const widths = Array.from(split.children, child => {
      const track = child as HTMLElement
      const style = view.getComputedStyle(track)

      if (style.display === 'none') {
        return 0
      }

      const nested = track.querySelector<HTMLElement>(':scope > [data-tree-split]')

      return Math.max(
        computedPx(style.minWidth, 0),
        horizontal ? computedPx(style.flexBasis, 0) : 0,
        nested ? measure(nested) : 0
      )
    })

    return horizontal ? widths.reduce((sum, width) => sum + width, 0) : Math.max(0, ...widths)
  }

  return measure(root)
}
