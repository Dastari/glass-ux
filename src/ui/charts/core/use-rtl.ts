import { useLayoutEffect, useState, type RefObject } from "react"
import { isRtl } from "../../../lib/direction.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/**
 * Whether the element sits in right-to-left text, read from its computed direction so a nested
 * `dir` region counts. For a chart whose layout follows the reading order (a funnel's columns, a
 * sankey's flow); it is read before paint, so the first frame is already mirrored.
 */
export function useRtl(ref: RefObject<Element | null>): boolean {
  const [rtl, setRtl] = useState(false)
  useIsomorphicLayoutEffect(() => {
    if (ref.current) setRtl(isRtl(ref.current))
  })
  return rtl
}
