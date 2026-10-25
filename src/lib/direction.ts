/** Resolve an element's actual CSS direction, including nested `dir` regions. */
export const isRtl = (element: Element): boolean => getComputedStyle(element).direction === "rtl"

/** Normalise a horizontal key to reading order; vertical and non-arrow keys are unchanged. */
export function readingKey(key: string, element: Element): string {
  return isRtl(element) ? key === "ArrowLeft" ? "ArrowRight" : key === "ArrowRight" ? "ArrowLeft" : key : key
}
